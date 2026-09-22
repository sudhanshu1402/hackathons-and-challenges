# Funngro Backend Assessment

Take-home submission - payout handler review + rewrite, reward points schema, production incident writeup.

Start with [`SUBMISSION.md`](SUBMISSION.md) - it has the bug list (severity-ordered), the schema reasoning, the incident walkthrough, assumptions, and the questions I'd ask.

## Setup / run

```bash
npm install
npm test         # jest - money-path tests against the rewritten handler
npm run typecheck
```

## Repo layout

```
SUBMISSION.md              Part 1 bug list + rewrite notes, Part 2 schema reasoning, Part 3 incident writeup
RECORDING_SCRIPT.md        outline for the Part 4 walkthrough recording

src/
  types.ts                 domain types - money as integer minor units
  db.ts                    minimal Collections interface the handler depends on (mocked in tests)
  gateway.ts               payout queue interface
  withdraw.original.ts     the handler as given in the PDF, kept only for reference/diff
  withdraw.ts              the rewrite - real code
  worker.pseudo.ts         payout worker + gateway webhook + reconciliation cron - pseudocode (infra I don't have here)
  points/
    schema.ts              Part 2 collections + indexes (with the query each index serves)
    monthlyReport.ts        Part 2 aggregation pipeline

tests/
  withdraw.test.ts          money-path tests: race safety, idempotency, validation, missing wallet
```

## What's deliberately left out (and why)

- Real transactions across the wallet debit + ledger write - see the note in `withdraw.ts` and `SUBMISSION.md` Part 1. Testing a fake transaction against a mock collection proves nothing; the correctness argument is documented at the point it applies.
- Auth middleware - `withdraw.ts` assumes `req.auth.userId` is already verified; I didn't invent an auth stack I don't know Funngro uses.
- KYC/limits/fees/multi-currency, rate-limiting the endpoint itself - out of scope for a 90-minute review of this one handler.

## Change summary

- **`withdraw.ts`**: idempotency key claimed (unique-indexed insert) *before* the debit is attempted, then atomic conditional debit, gateway call moved off the request path (enqueued, confirmed via webhook - see `worker.pseudo.ts`), input validation, integer minor units, auth-sourced `userId`, dropped the unbounded inline history query, response reflects `pending` state honestly.
- **`points/schema.ts` + `monthlyReport.ts`**: new - reward points collections, indexes, and the finance aggregation, built around the same append-only-ledger + atomic-conditional-decrement pattern as the wallet fix.
