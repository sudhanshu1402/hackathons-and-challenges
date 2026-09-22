import { LedgerEntry, User, Wallet, Withdrawal, WithdrawalStatus } from './types';

// Minimal slice of the MongoDB driver surface the handler actually uses.
// Kept as an interface (not `import { Db } from 'mongodb'`) so:
//   1. tests can mock it with plain jest.fn() - no real driver / memory-server needed.
//   2. the handler's real dependency is explicit and small.
// Trade-off (see SUBMISSION.md): this proves handler *logic*, not Mongo-level
// atomicity - the atomicity guarantee for findOneAndUpdate is a property of
// MongoDB itself (single-document ops are always atomic), not something a
// mock can disprove or a real DB test would prove more than the driver docs already do.

// NOTE: findOneAndUpdate returns the matched document directly, or `null` on
// no match. The real mongodb Node driver changed this shape between major
// versions - v4-era returned `{ value: T | null }`, current (v6.x) returns
// the document itself unless you opt into `includeResultMetadata: true`. This
// interface commits to the current shape; if you're on an older driver,
// convert at the call site, don't reintroduce the `.value` wrapper here.

// Thrown by Withdrawals.insertOne when idempotencyKey collides with an
// existing document (backed by a unique index in real Mongo - see
// points/schema.ts for the same pattern on conversions.idempotencyKey). In
// the real driver this surfaces as `MongoServerError` with `code === 11000`;
// this type is the abstraction the handler is written against so it isn't
// coupled to that literal driver detail.
export class DuplicateKeyError extends Error {
  constructor(public readonly field: string) {
    super(`duplicate key on ${field}`);
    this.name = 'DuplicateKeyError';
  }
}

export interface Collections {
  Users: {
    findOne(filter: { _id: string }): Promise<User | null>;
  };
  Wallets: {
    findOneAndUpdate(
      filter: Record<string, unknown>,
      update: Record<string, unknown>,
      opts: { returnDocument: 'after' }
    ): Promise<Wallet | null>;
  };
  Withdrawals: {
    findOne(filter: { idempotencyKey: string }): Promise<Withdrawal | null>;
    // Rejects with DuplicateKeyError if idempotencyKey already exists -
    // this is how the handler claims the key before debiting (see withdraw.ts).
    insertOne(doc: Withdrawal): Promise<{ insertedId: string }>;
    updateOne(
      filter: { _id: string },
      update: { $set: Partial<Pick<Withdrawal, 'status' | 'balanceAfter' | 'updatedAt'>> }
    ): Promise<void>;
  };
  Ledger: {
    insertOne(doc: LedgerEntry): Promise<{ insertedId: string }>;
  };
}

export type { WithdrawalStatus };
