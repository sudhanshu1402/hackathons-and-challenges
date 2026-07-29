import { makeWithdrawHandler } from '../src/withdraw';
import { Collections, DuplicateKeyError } from '../src/db';
import { PayoutQueue } from '../src/gateway';
import { LedgerEntry, User, Wallet, Withdrawal } from '../src/types';

// Mocked collections — see db.ts for why (fast, no real Mongo dependency).
// Wallets.findOneAndUpdate and Withdrawals.insertOne below have NO internal
// `await`, so each one's check-then-mutate body always runs to completion
// before yielding to the event loop — this is what makes the "concurrent
// requests" tests below a real proof of the atomic-guard / claim-key-first
// fixes, not just a logic smoke test.
function makeCollections(initial: { users: User[]; wallets: Wallet[] }) {
  const users = new Map(initial.users.map((u) => [u._id, u]));
  const wallets = new Map(initial.wallets.map((w) => [w.userId, w]));
  const withdrawalsByKey = new Map<string, Withdrawal>();
  const withdrawalsById = new Map<string, Withdrawal>();
  const ledger: LedgerEntry[] = [];

  const collections: Collections = {
    Users: {
      async findOne(filter) {
        return users.get(filter._id) ?? null;
      },
    },
    Wallets: {
      async findOneAndUpdate(filter, update) {
        const wallet = wallets.get(filter.userId as string);
        const minBalance = (filter.balance as { $gte?: number } | undefined)?.$gte;
        if (!wallet || (minBalance !== undefined && wallet.balance < minBalance)) {
          return null;
        }
        const inc = (update.$inc as { balance?: number } | undefined)?.balance ?? 0;
        wallet.balance += inc;
        return { ...wallet };
      },
    },
    Withdrawals: {
      async findOne(filter) {
        return withdrawalsByKey.get(filter.idempotencyKey) ?? null;
      },
      async insertOne(doc) {
        // Mirrors a unique index on idempotencyKey — this check-and-set has
        // no await inside it, so it can't be interleaved by a concurrent call.
        if (withdrawalsByKey.has(doc.idempotencyKey)) {
          throw new DuplicateKeyError('idempotencyKey');
        }
        withdrawalsByKey.set(doc.idempotencyKey, doc);
        withdrawalsById.set(doc._id, doc);
        return { insertedId: doc._id };
      },
      async updateOne(filter, update) {
        const doc = withdrawalsById.get(filter._id);
        if (!doc) throw new Error(`withdrawal ${filter._id} not found`);
        Object.assign(doc, update.$set);
      },
    },
    Ledger: {
      async insertOne(doc) {
        ledger.push(doc);
        return { insertedId: doc._id };
      },
    },
  };

  return { collections, wallets, withdrawalsById, ledger };
}

function makeQueue() {
  const jobs: unknown[] = [];
  const queue: PayoutQueue = {
    async enqueue(job) {
      jobs.push(job);
    },
  };
  return { queue, jobs };
}

function makeRes() {
  const res: any = { statusCode: 200, body: undefined };
  res.status = jest.fn((code: number) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body: unknown) => {
    res.body = body;
  });
  return res;
}

let idCounter = 0;
beforeEach(() => {
  idCounter = 0;
});

function makeDeps(collections: Collections, queue: PayoutQueue) {
  return {
    collections,
    queue,
    now: () => new Date('2026-01-15T12:00:00Z'),
    newId: () => `id-${++idCounter}`,
  };
}

describe('withdraw handler — money safety', () => {
  test('debits balance and returns pending on a valid withdrawal', async () => {
    const { collections, wallets } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 1000 }],
    });
    const { queue, jobs } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));
    const res = makeRes();

    await handler({ auth: { userId: 'u1' }, body: { amount: 400, idempotencyKey: 'k1' } } as any, res);

    expect(res.json).toHaveBeenCalledWith({ status: 'pending', withdrawalId: 'id-1' });
    expect(wallets.get('u1')!.balance).toBe(600);
    expect(jobs).toHaveLength(1);
  });

  test('rejects insufficient balance without debiting, and marks the withdrawal row failed', async () => {
    const { collections, wallets, withdrawalsById } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 100 }],
    });
    const { queue } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));
    const res = makeRes();

    await handler({ auth: { userId: 'u1' }, body: { amount: 400, idempotencyKey: 'k1' } } as any, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(wallets.get('u1')!.balance).toBe(100);
    expect(withdrawalsById.get('id-1')!.status).toBe('failed');
  });

  test('missing wallet is rejected like insufficient balance, no crash (bug #5)', async () => {
    const { collections } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [],
    });
    const { queue } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));
    const res = makeRes();

    await expect(
      handler({ auth: { userId: 'u1' }, body: { amount: 100, idempotencyKey: 'k1' } } as any, res)
    ).resolves.not.toThrow();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('rejects non-positive or non-integer amounts (bug #6)', async () => {
    const { collections } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 1000 }],
    });
    const { queue } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));

    for (const amount of [-50, 0, 12.5, NaN]) {
      const res = makeRes();
      await handler({ auth: { userId: 'u1' }, body: { amount, idempotencyKey: `k-${amount}` } } as any, res);
      expect(res.status).toHaveBeenCalledWith(422);
    }
  });

  test('duplicate idempotencyKey replays the prior result instead of debiting again (bug #2, sequential retry)', async () => {
    const { collections, wallets } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 1000 }],
    });
    const { queue, jobs } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));

    const res1 = makeRes();
    await handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'k1' } } as any, res1);
    const res2 = makeRes();
    await handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'k1' } } as any, res2);

    expect(wallets.get('u1')!.balance).toBe(700); // debited once, not twice
    expect(jobs).toHaveLength(1); // gateway job enqueued once
    expect(res1.body).toEqual(res2.body);
  });

  test('two concurrent requests with the SAME idempotencyKey debit only once (bug #1/#3 — claim-key-before-debit)', async () => {
    const { collections, wallets } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 1000 }],
    });
    const { queue, jobs } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));

    const resA = makeRes();
    const resB = makeRes();

    // This is the exact scenario idempotency exists for: a client timeout
    // fires a retry while the original request is still in flight, both
    // reaching the server with the same key. Before the claim-first fix,
    // both would pass Withdrawals.findOne === null and both would debit.
    await Promise.all([
      handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'same-key' } } as any, resA),
      handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'same-key' } } as any, resB),
    ]);

    expect(wallets.get('u1')!.balance).toBe(700); // debited exactly once, not 400
    expect(jobs).toHaveLength(1); // exactly one payout enqueued
    expect(resA.body).toEqual(resB.body); // both callers see the same outcome
  });

  test('two concurrent requests with DIFFERENT idempotency keys cannot both debit past the balance guard (bug #1 — TOCTOU race)', async () => {
    const { collections, wallets } = makeCollections({
      users: [{ _id: 'u1', bankAccount: 'acc-1' }],
      wallets: [{ userId: 'u1', balance: 500 }],
    });
    const { queue } = makeQueue();
    const handler = makeWithdrawHandler(makeDeps(collections, queue));

    const resA = makeRes();
    const resB = makeRes();

    // Two distinct legitimate requests racing — not a retry, which is
    // covered by the same-key tests above.
    await Promise.all([
      handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'a' } } as any, resA),
      handler({ auth: { userId: 'u1' }, body: { amount: 300, idempotencyKey: 'b' } } as any, resB),
    ]);

    const succeeded = [resA, resB].filter((r) => r.statusCode === 200);
    expect(succeeded).toHaveLength(1); // only one can go through against a 500 balance
    expect(wallets.get('u1')!.balance).toBe(200); // debited exactly once, never negative
  });
});
