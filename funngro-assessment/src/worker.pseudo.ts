// PSEUDOCODE - infra (BullMQ, gateway webhook route, cron) not runnable here.
// Included per the PDF: "money-safety logic must be real code, infra can be
// pseudocode." The money-safety logic (atomic debit, idempotency) lives in
// withdraw.ts and is real + tested. This file just shows where the gateway
// call and settlement actually happen, so the whole flow is legible.

// --- 1. Payout worker: consumes jobs enqueued by withdraw.ts ---
//
// queue.process('payout', async (job) => {
//   const { withdrawalId, reference, amount, account } = job.data;
//
//   const withdrawal = await Withdrawals.findOne({ _id: withdrawalId });
//   if (withdrawal.status !== 'pending') return; // already handled - safe to no-op on redelivery
//
//   await Withdrawals.updateOne({ _id: withdrawalId }, { $set: { status: 'sent' } });
//
//   // gateway.createPayout must be called with the SAME `reference` on every
//   // retry (BullMQ retries on throw) so the gateway's own dedupe on
//   // reference protects us if our process crashes mid-call and BullMQ
//   // redelivers the job.
//   await gateway.createPayout({ account, amount, reference });
//   // Do NOT mark 'settled' here - createPayout accepting the call means
//   // "gateway received it", not "money arrived". Settlement is confirmed
//   // by the webhook below. This is the fix for bug #3.
// });

// --- 2. Gateway webhook: source of truth for settlement ---
//
// app.post('/webhooks/gateway/payout', verifyGatewaySignature, async (req, res) => {
//   const { reference, status } = req.body; // status: 'settled' | 'failed'
//
//   const withdrawal = await Withdrawals.findOne({ gatewayReference: reference });
//   if (!withdrawal) return res.status(404).end(); // log + alert, don't 500 (gateway will retry)
//
//   if (status === 'settled') {
//     await Withdrawals.updateOne({ _id: withdrawal._id }, { $set: { status: 'settled' } });
//   } else {
//     // Gateways retry webhook delivery - a redelivered 'failed' event must
//     // NOT credit the wallet twice. Guard the reversal with the SAME
//     // status check the worker uses for redelivery (line 13), and make the
//     // guard + credit one atomic conditional update, not a separate
//     // find-then-update (that reopens the exact TOCTOU race fixed in
//     // withdraw.ts - see bug #1).
//   const result = await Withdrawals.updateOne(
//     { _id: withdrawal._id, status: { $in: ['pending', 'sent'] } }, // only from a not-yet-terminal state
//     { $set: { status: 'failed' } }
//   );
//   if (result.matchedCount === 0) return res.status(200).end(); // already reversed by a prior delivery - no-op
//
//     // Reverse the debit - credit the wallet back, atomically, and record it
//     // in the ledger as a distinct entry (never mutate the original debit row).
//     // NOTE: a crash between the status flip above and this credit loses the
//     // reversal silently (status is already 'failed', so a redelivery no-ops
//     // and the user never gets their money back) - same transaction-boundary
//     // problem as the debit path (see bug #4 / withdraw.ts), same fix: these
//     // two ops need to be one session transaction in real Mongo.
//     await Wallets.updateOne({ userId: withdrawal.userId }, { $inc: { balance: withdrawal.amount } });
//     await Ledger.insertOne({ userId: withdrawal.userId, type: 'withdrawal_reversal', withdrawalId: withdrawal._id, amount: withdrawal.amount, createdAt: new Date() });
//   }
//
//   res.status(200).end();
// });

// --- 3. Reconciliation cron: catches anything the webhook missed ---
//
// cron.schedule('*/15 * * * *', async () => {
//   const stale = await Withdrawals.find({ status: { $in: ['pending', 'sent'] }, createdAt: { $lt: fifteenMinutesAgo() } });
//   for (const w of stale) {
//     const gatewayStatus = await gateway.getPayoutStatus(w.gatewayReference);
//     // ... reconcile same as webhook branch above. This is the backstop for
//     // a dropped webhook - never trust the webhook as the *only* path.
//   }
// });

export {};
