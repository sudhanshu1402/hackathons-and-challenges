# Submission — Funngro Backend Assessment

## Assumptions (stated up front, per the ground rules)

- **Money is integer minor units (paise)** everywhere in my code. The gateway's real float/decimal expectation is a boundary-conversion concern I'd confirm with you.
- **`gateway.createPayout` is async and settles later** — it accepts a client-supplied `reference` it dedupes on, returns quickly (queued/pending), and the real outcome arrives via a webhook. This is the single biggest assumption in my rewrite; if the gateway is actually synchronous and returns final status immediately, the design simplifies (no worker/webhook needed, but the debit-before-confirm ordering bug still applies).
- **`userId` comes from an authenticated session/token**, never `req.body`. The given handler trusts the body, which is a separate authz bug from everything else — I fixed it but didn't invent an auth middleware, since I don't know your auth stack.
- **Idempotency key is client-generated per logical withdrawal attempt** (not regenerated on retry). If your mobile client currently regenerates a key on retry, idempotency at my layer does nothing and the key generation needs fixing client-side too — this is one of my sharp questions below.
- **Redis + BullMQ** for the queue (matches my current stack). Any queue with at-least-once delivery works the same way.
- **Points**: cohort = signup month, expiry = fixed TTL consumed FIFO. Not told either in the PDF.
- **Out of scope, deliberately**: KYC/AML checks, per-day/per-user withdrawal limits (I put a placeholder constant, flagged `ponytail`), fees, multi-currency, exact points-expiry policy nuances, rate-limiting the endpoint itself, real transactions (see note in Part 1 rewrite section) — all beyond a 90-minute timebox and not asked for.

## Sharp questions I'd ask Funngro

1. Is `createPayout` sync (final result immediately) or async (settles via webhook/poll)? This changes the whole shape of the fix.
2. Does the gateway dedupe on `reference`, or do we need our own outbox/dedupe table regardless?
3. What does the gateway API actually expect for amount — integer minor units, decimal string, float?
4. Does the mobile client reuse one idempotency key across retries of the *same* logical request, or mint a new one each time? (If the latter, that's a client bug I can't fix server-side alone.)
5. What defines a "cohort" for the points report — signup month, acquisition channel, something else?
6. What's the actual points expiry rule — fixed TTL from earn date, or tied to a calendar cycle?

---

## Part 1 — Bug list (most dangerous first)

1. **Non-atomic check-then-set balance (TOCTOU race).** The handler reads `wallet.balance`, computes `newBalance` in JS, then `$set`s it. Two requests for the same user — concurrent, or the mobile app's own timeout-retry hitting the server twice while the first is still in flight — both read the same starting balance, both pass the `>=` check, both write independently. Second write clobbers the first: user with ₹100 can withdraw ₹100 twice and end up with a debited balance of ₹0 having received two payouts, or worse, a negative-intent balance masked by write order. **This is the one that directly loses money at volume**, and it's silent — no error, no log, just wrong numbers. Fix: single atomic `findOneAndUpdate({userId, balance:{$gte:amount}}, {$inc:{balance:-amount}})` — MongoDB guarantees single-document ops are atomic, so the guard and the mutation happen as one indivisible step.

2. **No idempotency key, and the mobile app retries on timeout.** This is explicitly called out in the assessment's assumptions, so it's not hypothetical — it's a guaranteed production scenario. A slow request (already likely given bug #8) times out client-side, the app retries, the server processes both as independent withdrawals. Every timeout on payout day becomes a double payout. Fix: client-supplied `idempotencyKey`, unique index on `Withdrawals.idempotencyKey`, first request executes, retries look it up and replay the stored result.

3. **Debit happens before the gateway call is confirmed, the call isn't awaited, and its error is swallowed.** `gateway.createPayout(...)` is fired without `await`, wrapped in a try/catch that only `console.log`s. Three independent problems stacked: (a) not awaiting means the handler can't know if the call even started successfully before responding; (b) the wallet is already debited and the ledger already written by the time this runs, so a gateway failure leaves the user's money gone with no payout and no error surfaced anywhere but a log line; (c) this is *exactly* "money debited but not received," the complaint described in Part 3. Fix: never gate the debit on the gateway call succeeding *or* failing — enqueue the actual payout as a separate step, confirm real settlement via webhook, and only report success once that arrives.

4. **No transaction/consistency guarantee between the wallet debit and the ledger insert.** If the process crashes or the DB hiccups between the `Wallets` update and the `Ledger.insertOne`, the wallet is debited but there's no audit row — the ledger (used for the finance report and now, in my rewrite, for reconciliation) silently disagrees with the wallet. At Funngro's stated scale this is a compliance/audit problem, not just a bug. Fix: session transaction across the two writes, or a ledger-first outbox pattern where the wallet mutation is derived from the ledger rather than written independently.

5. **`wallet` can be `null` and the code dereferences `wallet.balance` unguarded.** Any user without a wallet record throws an uncaught exception → 500, unhandled promise rejection risk depending on the framework. Fix: guard for null before use (in my rewrite this is folded into the atomic `findOneAndUpdate`, which simply returns no match rather than crashing — see the design note in Part 1c).

6. **`amount` is never validated.** No type check, no positivity check, no upper bound. A negative amount passes `wallet.balance >= amount` trivially and then `$inc`s the balance *up* while still invoking a payout for a negative amount — free money out through a bug, not even a security exploit. A string, `NaN`, or a huge number all misbehave differently but all get past the current check. Fix: assert `Number.isInteger(amount) && amount > 0 && amount <= MAX`.

7. **Money handled as floating point.** `amount * 1.0` and float balances accumulate rounding error over millions of transactions — small per-transaction, real in aggregate, and genuinely painful to audit after the fact. Fix: integer minor units throughout, float conversion only at the literal API boundary if the gateway demands it.

8. **`Ledger.find({userId}).sort({createdAt:-1})` with no supporting index, against 40M documents, on every single withdrawal call.** This is a full collection scan (only the default `_id` index exists) that returns a user's *entire* withdrawal history inline with the response, and does it on every request. This is almost certainly the direct cause of the Part 3 incident: as `Ledger` grew toward 40M, this query's cost grew with it, and it sits directly in the hot path of the money-moving endpoint. Fix: drop history from this response entirely (a write endpoint returning full read history is the wrong shape anyway); if history is needed, it's a separate, indexed (`{userId:1, createdAt:-1}`), paginated endpoint.

9. **Gateway `reference: 'WD-' + Date.now()`** is non-deterministic across retries — the exact same logical withdrawal gets a different reference each time it's retried, which defeats any dedupe the gateway itself might do on that field. Fix: reference derived from a stable ID (the withdrawal's own `_id` / the idempotency key), so retries and the gateway's own dedupe actually line up.

10. **`userId` taken from `req.body`, not from an authenticated session.** Anyone who can call this endpoint can pass any `userId` and drain that user's wallet to *their own* bank account context via `user.bankAccount` lookup — this is a straight-up account-drain vector, not a subtle bug. Fix: `userId` from verified auth context only.

11. **Response says `ok: true` and returns the new balance before the gateway has done anything.** This actively misinforms the client that money has moved when, in the given code, nothing has been confirmed yet (and per bug #3, might never be). Fix: response reflects reality — `status: 'pending'` — until settlement is confirmed.

## Part 1 — Rewrite

See [`src/withdraw.ts`](src/withdraw.ts) (real, tested) and [`src/worker.pseudo.ts`](src/worker.pseudo.ts) (pseudocode for the gateway worker, webhook, and reconciliation cron — infra I don't have here, per the PDF's own allowance).

Design in one line: **validate → claim the idempotency key (unique-indexed insert, status `pending`) → atomic conditional debit → update the withdrawal row + ledger → enqueue the actual payout → return `pending`.** The gateway call and its confirmation are entirely decoupled from the debit.

The ordering of the middle two steps is the part I'd defend hardest: the idempotency key is **claimed by inserting the withdrawal row before the debit is attempted**, not after. Claiming after the debit (my first draft) leaves a window where two concurrent requests carrying the *same* key both pass the debit's `$gte` guard before either has recorded the key — the guard only stops overdraft, not a same-key double-debit — and a crash between debit and insert leaves no row for a retry to find, so the retry debits again. Claiming first closes both: the unique index on `Withdrawals.idempotencyKey` means at most one insert can ever win for a given key, and the loser catches the duplicate-key error and replays instead of proceeding to debit at all.

One driver-level detail worth flagging explicitly: `findOneAndUpdate`'s return shape changed between MongoDB Node driver major versions — older versions wrapped the result as `{ value: T | null }`, the current default returns the document directly. `db.ts` commits to the current shape and calls this out in a comment, because getting it backwards is a silent bug: every successful update would look like "no match" and the endpoint would 400 every valid withdrawal.

Tests: [`tests/withdraw.test.ts`](tests/withdraw.test.ts), against mocked collections (see [`src/db.ts`](src/db.ts) for why — mocks prove handler *logic*; the atomicity guarantee itself is a property of MongoDB's single-document operations, not something a mock or a real-DB test proves any harder). Two tests fire calls through `Promise.all` against mocks whose `findOneAndUpdate`/`insertOne` have no internal `await` (so each one's check-then-mutate body can't be interleaved) — one proves same-key concurrent requests debit exactly once (the claim-first fix), the other proves different-key concurrent requests can't both clear the balance guard (the original TOCTOU fix). That's a legitimate proof that the *guard logic* is race-safe, not a claim that it exercises real Mongo internals.

I did not stand up a transaction across the debit + ledger write (bug #4) against the mock — a fake transaction over an in-memory mock would test nothing; the correctness argument for it is written as a comment at the point it belongs, and it's real work I'd do with `mongodb-memory-server` in replica-set mode if this needed to go further than a take-home.

## Part 1c — Beyond this one function (3–5 sentences)

I'd move the actual gateway call and its confirmation onto a queue + webhook (or poll-based reconciliation) so the wallet debit is never coupled to a live network call's success or failure. I'd make the `Ledger` collection the append-only source of truth with a withdrawal state machine (`pending → sent → settled/failed`) rather than trusting `Wallets.balance` as authoritative on its own, and add a scheduled reconciliation job that diffs our `pending`/`sent` withdrawals against the gateway's own record — webhooks get dropped, and gateways also *redeliver*, so the webhook's failure-reversal branch needs the same not-already-terminal status guard the worker uses for its own redelivery, or a duplicate "failed" event double-credits the wallet (see the comment in `worker.pseudo.ts`). I'd add the `{userId, createdAt}` index on `Ledger` before this ships regardless of the history-in-response fix, since 40M docs with only `_id` indexed is a latent incident independent of this endpoint. And I'd put a per-user rate limit / daily cap in front of this endpoint — nothing here currently stops a compromised client from firing withdrawal requests as fast as the idempotency keys allow.

---

## Part 2 — Reward points schema

See [`src/points/schema.ts`](src/points/schema.ts) for the typed collections and the index list with the query each serves, and [`src/points/monthlyReport.ts`](src/points/monthlyReport.ts) for the aggregation pipeline.

**Design**: `pointsLedger` is append-only (mirrors the `Ledger` pattern from Part 1 — same lesson applies: audit trail as source of truth, not a mutable balance field). `pointsBalance` is a materialized, rebuildable cache for fast reads and for the atomic conditional decrement on convert. `conversions` is one row per attempt with a unique `idempotencyKey`. `conversionRates` versions the rate over time so a conversion always records *which* rate it used, satisfying the audit requirement without needing to reconstruct history from a single mutable "current rate" field.

**Trade-offs rejected**:
- *Single collection for earn+convert+expire+balance, mutated in place*: rejected — no audit trail, and "auditable" is an explicit requirement. An append-only ledger is strictly more defensible to finance and costs one extra collection.
- *Storing the conversion rate inline as a float on each user record instead of a versioned `conversionRates` collection*: rejected — "rate changes over time" plus "auditable" together mean a past conversion must be able to point at the exact rate it used, which a single current-rate field can't do once the rate moves.
- *Computing the monthly report by scanning `pointsBalance` deltas instead of `pointsLedger`*: rejected — `pointsBalance` only holds current state, not a monthly breakdown of earned/converted/expired; the ledger is the only collection with the per-event granularity finance is asking for.

## Part 2b — Monthly finance aggregation

See [`src/points/monthlyReport.ts`](src/points/monthlyReport.ts). `$match` the month range → `$group` by user+cohort summing `points` conditionally by `type` → `$project` into `earned/converted/expired`.

Index note: the report's `$match` filters on `createdAt` alone, across every user — it has no `userId`/`cohort` equality clause. A compound index only helps a query that filters on its *prefix* field, so `{userId,createdAt}` and `{cohort,createdAt}` can't be seeked by this stage; they exist instead for a narrower, different query (a single user's points history, a single cohort's drill-down). The report itself needs a standalone `{createdAt:1}` index — this is documented explicitly in `schema.ts` because it's an easy trap: an index name that *sounds* relevant to "the monthly report" doesn't necessarily serve the actual query shape.

## Part 2c — Preventing double-conversion under concurrency (one paragraph)

The same primitive as the Part 1 debit: converting points is an atomic conditional decrement — `pointsBalance.findOneAndUpdate({userId, available:{$gte:points}}, {$inc:{available:-points}})` — so two concurrent conversion requests can't both read the same pre-conversion balance and both succeed past what's actually available; MongoDB's single-document atomicity makes the guard-and-mutate indivisible. On top of that, `conversions.idempotencyKey` is uniquely indexed, so a retried conversion request (same failure mode as the withdrawal retries in Part 1) replays the stored result instead of decrementing twice. The two mechanisms cover different failure modes: the atomic decrement stops two *different* concurrent requests from over-converting past the balance; the idempotency key stops the *same* logical request, retried, from converting twice at all.

---

## Part 3 — Production incident (first 30 minutes)

**Minute 0–3, stop the bleeding, before root cause:**
- Check the gateway dashboard first, not the DB — if the gateway itself is slow/erroring, every debit-then-call-gateway request is going to look identical to what's being reported ("debited but not received"), and no amount of DB tuning fixes a gateway outage. **Trigger**: gateway p95/error-rate dashboard shows a spike aligned with 9pm → this is very likely gateway-side, not our DB. If gateway looks clean, move to Atlas.
- Atlas → **Performance Advisor** and the **Query Profiler / slow query log** for the `withdraw` collection paths. Given the PDF's own hint (`Ledger` at 40M docs, only `_id` indexed), my first real guess is a COLLSCAN on the unbounded `Ledger.find({userId}).sort({createdAt:-1})` inside the handler — that query's cost grows with collection size and it sits in the hot path of every withdrawal. **Trigger**: if Atlas shows `COLLSCAN` / high `docsExamined:nReturned` ratio on that query → confirmed, this is (at least a major part of) the latency source.
- **Immediate mitigation, independent of root cause**: if I can ship a one-line hotfix (drop the `Ledger.find` history call from the response, or add `.limit(50)` + the missing index as a background build), I ship that first — it's low-risk and directly targets the confirmed symptom. If I can't ship code safely at 9pm on payout day, I'd rate-limit or queue incoming withdrawal requests at the load balancer/API gateway level to reduce concurrent load, buying time without touching the money path itself.
- **What I would NOT do**: I would not restart the app servers blind — if requests are stuck mid-flight between the debit and the gateway call (bug #3's exact failure mode), a restart doesn't undo an already-applied debit, it just orphans in-flight state and makes the eventual reconciliation harder, not easier. I would also not manually issue refunds to complaining users yet — without knowing whether their payout actually is stuck vs. delayed vs. never sent, a manual refund on top of a payout that later does land is a second money-losing bug layered on the first incident.

**Minute 3–15, confirm and narrow:**
- Cross-reference app logs for the specific complaining users: did their request log a debit, and does the gateway dashboard show a corresponding payout attempt for that reference? This tells me whether it's (a) debit succeeded, gateway call never fired/failed silently (matches bug #3 exactly — the unawaited, swallowed-error gateway call), or (b) gateway received it and is just slow to settle.
- Check Atlas connection pool / lock metrics — if the slow `Ledger` query is holding connections/cursors under load, that alone can cascade into the 300ms→11s p95 climb across unrelated requests, not just the withdraw path.
- Grep logs for the `console.log('gateway error', e)` line specifically — if that's firing at volume, it's direct confirmation that gateway calls are failing after the debit already happened, i.e., the exact "debited but not received" mechanism.

**Minute 15–30, contain and communicate:**
- If confirmed as bug #3's failure mode (debit committed, gateway call failed/never confirmed): stop new withdrawals from processing past the debit step until the gateway path is fixed or a manual reconciliation queue is stood up for affected users — better to briefly disable withdrawals than to keep compounding a known money-losing pattern on payout day.
- Communicate status to support with a concrete, falsifiable statement ("affected users = those who withdrew between X:XX and now, we are reconciling, do not manually adjust balances") rather than a vague "we're looking into it" — support needs something specific enough to stop escalating internally.
- Root cause + prevention (post-mitigation, not in the 30-minute window): the `{userId, createdAt}` index on `Ledger`, removing history from the write path, and the Part 1 rewrite's decouple-debit-from-gateway-call design are the actual fixes; the 30-minute window above is entirely about containment and diagnosis, not shipping the full rewrite live.
