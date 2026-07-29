// Money is always integer minor units (e.g. paise) — never a float.
// Assumption (see SUBMISSION.md): gateway boundary converts to whatever the real API expects.
export type MinorUnits = number;

export interface User {
  _id: string;
  bankAccount: string;
}

export interface Wallet {
  userId: string;
  balance: MinorUnits;
}

export type WithdrawalStatus = 'pending' | 'sent' | 'settled' | 'failed';

export interface Withdrawal {
  _id: string;
  userId: string;
  idempotencyKey: string;
  amount: MinorUnits;
  status: WithdrawalStatus;
  // null until the debit succeeds — the row is inserted (claiming the
  // idempotency key) before the debit is attempted, so this is unknown yet.
  balanceAfter: MinorUnits | null;
  gatewayReference: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LedgerEntry {
  _id: string;
  userId: string;
  type: 'withdrawal';
  withdrawalId: string;
  amount: MinorUnits;
  balanceAfter: MinorUnits;
  createdAt: Date;
}

export interface WithdrawRequest {
  amount: MinorUnits;
  idempotencyKey: string;
}

// Populated by auth middleware — never trust req.body for identity.
export interface AuthedRequest {
  auth: { userId: string };
  body: WithdrawRequest;
}
