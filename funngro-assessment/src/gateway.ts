// Assumption (see SUBMISSION.md - sharp question for Funngro): createPayout is
// async and dedupes on `reference`. The handler never calls this directly -
// it enqueues a job; worker.pseudo.ts owns the actual gateway call + webhook.
export interface PayoutQueue {
  enqueue(job: { withdrawalId: string; reference: string; amount: number; account: string }): Promise<void>;
}
