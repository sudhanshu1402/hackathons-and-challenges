# Recording script - ≤5 min, Part 4

Talking points, not a script. Record once, no editing.

## 1. The two most dangerous bugs, and why they're ranked first (~2 min)

**Bug #1 - non-atomic check-then-set balance.** Show `withdraw.original.ts` lines with `wallet.balance >= amount` then a separate `$set`. Say in your own words: two requests read the same balance, both pass the check, second write clobbers the first - silent double payout, no error anywhere. Ranked #1 because it's the one that loses money with zero signal that anything went wrong.

**Bug #2 - no idempotency key, and the PDF tells us the mobile app retries on timeout.** This isn't hypothetical - it's a stated fact of the system. Every timeout on payout day = a guaranteed double withdrawal. Ranked #2 because it's not a rare race, it's a certainty given the stated retry behavior.

Say why #1 outranks #2 if asked: #1 can fire even without a retry (two legitimate concurrent requests, or a load balancer hiccup); #2 needs the retry path specifically. Both are money-losing; #1 is the more fundamental one because fixing #1 (atomic conditional update) is also a prerequisite building block for fixing #2 cleanly.

## 2. Walk the rewrite's money path (~2 min)

Open `withdraw.ts`. Point at, in order:
- validation (positive integer, bounds)
- idempotency lookup - show it returns early with the prior result
- the atomic `findOneAndUpdate` with `$gte` guard + `$inc` - say out loud *why* this is atomic (single-document op, MongoDB guarantee, not something the code has to protect itself)
- the gateway call is **not here** - point at `worker.pseudo.ts`, explain the debit is never gated on a live network call succeeding

## 3. One decision you weren't sure about + your question for them (~1 min)

Pick one, honestly, in your own words:
- Whether `createPayout` is actually sync or async in their real system - the whole worker/webhook design assumes async-with-webhook; if it's sync, the fix is simpler but the assumption is the load-bearing part of the answer.
- Whether folding "wallet doesn't exist" and "insufficient balance" into the same 400 response (rather than a 404) is the right call - you made it deliberately to avoid leaking wallet-existence info, but it's a judgment call, not an obviously-correct one.

Say it like you're actually unsure, because you are - that's the point of this section.
