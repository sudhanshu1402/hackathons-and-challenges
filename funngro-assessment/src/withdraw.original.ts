// Verbatim copy of the handler given in the assessment PDF, kept only as a
// reference point for the diff and for the bug list in SUBMISSION.md.
// Not imported by anything, not type-checked against real collections.

// POST /api/wallet/withdraw
// body: { userId, amount }
async function withdraw(req: any, res: any) {
  const { userId, amount } = req.body;

  const user = await Users.findOne({ _id: userId });
  if (!user) return res.status(404).json({ error: 'user not found' });

  const wallet = await Wallets.findOne({ userId: userId });

  if (wallet.balance >= amount) {
    const newBalance = wallet.balance - amount;

    await Wallets.updateOne(
      { userId: userId },
      { $set: { balance: newBalance } }
    );

    try {
      gateway.createPayout({
        account: user.bankAccount,
        amount: amount * 1.0,
        reference: 'WD-' + Date.now(),
      });
    } catch (e) {
      console.log('gateway error', e);
    }

    await Ledger.insertOne({
      userId: userId,
      type: 'withdrawal',
      amount: amount,
      balanceAfter: newBalance,
      createdAt: new Date(),
    });

    const history = await Ledger.find({ userId: userId }).sort({ createdAt: -1 });

    return res.json({ ok: true, balance: newBalance, history: history });
  } else {
    return res.status(400).json({ error: 'insufficient balance' });
  }
}

declare const Users: any, Wallets: any, Ledger: any, gateway: any;
export {};
