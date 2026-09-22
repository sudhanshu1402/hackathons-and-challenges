// Part 2b - monthly finance report: per user (and cohort), points earned,
// converted, expired in a given month. Real aggregation shape - runnable
// against a `pointsLedger` collection with the schema in schema.ts.

export function monthlyPointsReportPipeline(monthStart: Date, monthEnd: Date) {
  return [
    // Uses the standalone {createdAt:1} index from schema.ts - this stage
    // has no userId/cohort equality filter, so the {userId,createdAt} and
    // {cohort,createdAt} compound indexes (which serve narrower per-user /
    // per-cohort lookups) can't be seeked by a bare date-range scan.
    { $match: { createdAt: { $gte: monthStart, $lt: monthEnd } } },
    {
      $group: {
        _id: { userId: '$userId', cohort: '$cohort' },
        earned: {
          $sum: { $cond: [{ $eq: ['$type', 'earn'] }, '$points', 0] },
        },
        converted: {
          // stored negative on the ledger; report wants a positive magnitude
          $sum: { $cond: [{ $eq: ['$type', 'convert'] }, { $abs: '$points' }, 0] },
        },
        expired: {
          $sum: { $cond: [{ $eq: ['$type', 'expire'] }, { $abs: '$points' }, 0] },
        },
      },
    },
    {
      $project: {
        _id: 0,
        userId: '$_id.userId',
        cohort: '$_id.cohort',
        earned: 1,
        converted: 1,
        expired: 1,
      },
    },
    { $sort: { cohort: 1, userId: 1 } },
  ];
}
