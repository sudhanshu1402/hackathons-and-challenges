import { Collections, DuplicateKeyError } from './db';
import { PayoutQueue } from './gateway';
import { AuthedRequest, LedgerEntry, MinorUnits, Withdrawal } from './types';

interface Deps {
  collections: Collections;
  queue: PayoutQueue;
  now(): Date;
  newId(): string;
}

interface Res {
  status(code: number): Res;
  json(body: unknown): void;
}

// ponytail: arbitrary cap until Funngro gives a real per-txn/day limit — ask them.
const MAX_WITHDRAWAL: MinorUnits = 500_000_00;

function replayResponse(res: Res, existing: Withdrawal) {
  if (existing.status === 'failed') {
    return res.status(400).json({ error: 'insufficient balance', withdrawalId: existing._id });
  }
  return res.json({ status: existing.status, withdrawalId: existing._id });
}

export function makeWithdrawHandler(deps: Deps) {
  return async function withdraw(req: AuthedRequest, res: Res) {
    const userId = req.auth.userId; // never req.body.userId (bug #10 — authz)
    const { amount, idempotencyKey } = req.body;

    if (!Number.isInteger(amount) || amount <= 0) {
      return res.status(422).json({ error: 'amount must be a positive integer (minor units)' });
    }
    if (amount > MAX_WITHDRAWAL) {
      return res.status(422).json({ error: 'amount exceeds max withdrawal' });
    }
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      return res.status(422).json({ error: 'idempotencyKey required' });
    }

    const user = await deps.collections.Users.findOne({ _id: userId });
    if (!user) return res.status(404).json({ error: 'user not found' });

    // Fast path: sequential retry of an already-resolved request. This is an
    // optimization, not the correctness guarantee — see the insert below for that.
    const priorAttempt = await deps.collections.Withdrawals.findOne({ idempotencyKey });
    if (priorAttempt) {
      return replayResponse(res, priorAttempt);
    }

    const withdrawalId = deps.newId();
    const gatewayReference = withdrawalId; // deterministic, not Date.now() (bug #9)
    const now = deps.now();

    // Claim the idempotency key BEFORE touching the balance, not after. This
    // is what makes idempotency actually race-safe (bug #1 / #2 combined):
    // the unique index on idempotencyKey (see db.ts) means at most one
    // request can ever win this insert for a given key — the loser catches
    // DuplicateKeyError and replays instead of debiting. Claiming *after* the
    // debit (the earlier draft of this handler did that) leaves a window
    // where two concurrent requests with the same key both pass the debit's
    // $gte guard before either has inserted, and a crash between debit and
    // insert leaves no record at all for a retry to find — both double-debit.
    const withdrawalDoc: Withdrawal = {
      _id: withdrawalId,
      userId,
      idempotencyKey,
      amount,
      status: 'pending',
      balanceAfter: null, // filled in once the debit below resolves
      gatewayReference,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await deps.collections.Withdrawals.insertOne(withdrawalDoc);
    } catch (err) {
      if (err instanceof DuplicateKeyError) {
        // Lost the race for this key to a concurrent request (or our own
        // retry landed after another in-flight one). Replay its outcome —
        // do NOT proceed to debit.
        const existing = await deps.collections.Withdrawals.findOne({ idempotencyKey });
        if (existing) return replayResponse(res, existing);
      }
      throw err;
    }

    // Atomic conditional debit (bug #1 — TOCTOU race, the *overdraft* half of
    // it). A single-document findOneAndUpdate is atomic in MongoDB: the
    // $gte guard and the $inc happen as one op, so two concurrent requests
    // for different idempotency keys can't both pass the check against the
    // same pre-debit balance. The *double-debit-of-one-key* half is handled
    // above by the claim-first insert.
    const updatedWallet = await deps.collections.Wallets.findOneAndUpdate(
      { userId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { returnDocument: 'after' }
    );

    if (!updatedWallet) {
      await deps.collections.Withdrawals.updateOne(
        { _id: withdrawalId },
        { $set: { status: 'failed', updatedAt: deps.now() } }
      );
      return res.status(400).json({ error: 'insufficient balance', withdrawalId });
    }

    // NOTE: this updateOne and the Ledger insert below belong in one session
    // transaction in real Mongo (or ledger-first via outbox) so a crash
    // between them can't desync balance vs audit trail (bug #4). Not modeled
    // against a mock — a fake transaction here would prove nothing; see
    // SUBMISSION.md.
    await deps.collections.Withdrawals.updateOne(
      { _id: withdrawalId },
      { $set: { balanceAfter: updatedWallet.balance, updatedAt: deps.now() } }
    );

    const ledgerEntry: LedgerEntry = {
      _id: deps.newId(),
      userId,
      type: 'withdrawal',
      withdrawalId,
      amount,
      balanceAfter: updatedWallet.balance,
      createdAt: now,
    };
    await deps.collections.Ledger.insertOne(ledgerEntry);

    // Gateway call is enqueued, not made inline — a worker owns the real call
    // and only marks 'settled' on webhook confirmation (bug #3: the debit is
    // never gated on an unawaited, unconfirmed network call). See worker.pseudo.ts.
    await deps.queue.enqueue({
      withdrawalId,
      reference: gatewayReference,
      amount,
      account: user.bankAccount,
    });

    // 'pending', not ok:true — money isn't sent yet (bug #11).
    // History dropped from the response entirely — it was an unbounded,
    // unindexed Ledger.find on 40M docs (bug #8); it becomes its own
    // paginated, indexed endpoint instead.
    return res.json({ status: 'pending', withdrawalId });
  };
}
