// Part 2 - reward points schema. Types only (no driver calls) - this is the
// design artifact; reasoning + rejected trade-offs are in SUBMISSION.md.

export type PointsLedgerType = 'earn' | 'convert' | 'expire';

// Append-only. Every points movement is one row here - this is the audit trail.
export interface PointsLedgerEntry {
  _id: string;
  userId: string;
  cohort: string; // assumption: cohort = signup month, e.g. "2026-01" - ask Funngro for real definition
  type: PointsLedgerType;
  points: number; // signed: earn > 0, convert/expire < 0
  source: 'project' | 'promotion' | 'conversion' | 'expiry_job';
  sourceRef: string; // projectId / promoId / conversionId - traces back to the cause
  createdAt: Date;
  expiresAt: Date | null; // set on 'earn' entries; assumption: fixed TTL, FIFO consumption
}

// Materialized, rebuildable from pointsLedger - read-path optimization only,
// never the source of truth. Kept in sync by the same op that writes 'convert'.
export interface PointsBalance {
  userId: string;
  available: number;
  updatedAt: Date;
}

export interface ConversionRate {
  _id: string;
  rate: number; // cash minor units per point
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

// One row per conversion attempt. Unique idempotencyKey is what blocks
// double-convert under concurrent requests - see SUBMISSION.md 2c.
export interface Conversion {
  _id: string;
  userId: string;
  idempotencyKey: string;
  points: number;
  rateId: string;
  cashMinorUnits: number;
  walletTxnId: string | null; // links to the wallet credit once applied
  status: 'pending' | 'applied' | 'failed';
  createdAt: Date;
}

// Index list - each tied to the query it serves (PDF asks "why each one exists").
//
// Note on the monthly report specifically (monthlyReport.ts): its $match is
// a createdAt range with NO equality filter on userId or cohort - it
// aggregates across everyone in one pass. A compound index only helps a
// query that filters on its prefix field(s); {userId,createdAt} and
// {cohort,createdAt} below can't be seeked by a bare date-range scan, so a
// standalone {createdAt:1} index is what actually serves the report. The two
// compound indexes exist for a *different*, narrower access pattern: a
// single user's points history, or a single cohort's drill-down - both of
// which DO filter on userId/cohort first.
export const INDEXES = [
  {
    collection: 'pointsLedger',
    keys: { createdAt: 1 },
    reason: 'monthly finance report: $match on createdAt range only, across all users - needs date as the leading/only key',
  },
  {
    collection: 'pointsLedger',
    keys: { userId: 1, createdAt: 1 },
    reason: "a single user's points history (userId equality + date sort) - NOT the aggregate monthly report, see note above",
  },
  {
    collection: 'pointsLedger',
    keys: { cohort: 1, createdAt: 1 },
    reason: "a single cohort's drill-down (cohort equality + date sort) - NOT the aggregate monthly report, see note above",
  },
  {
    collection: 'pointsLedger',
    keys: { expiresAt: 1 },
    options: { partialFilterExpression: { type: 'earn', expiresAt: { $ne: null } } },
    reason: 'expiry cron scans only unexpired earn rows, not the whole ledger',
  },
  {
    collection: 'conversions',
    keys: { idempotencyKey: 1 },
    options: { unique: true },
    reason: 'dedupe: a retried convert request hits this and returns the prior result',
  },
  {
    collection: 'pointsBalance',
    keys: { userId: 1 },
    options: { unique: true },
    reason: 'point lookup + the atomic conditional decrement on convert',
  },
] as const;
