// Application-level counts, not billing: index reads and SDK-internal retries are excluded.
export function createCampaignUsage(now = Date.now) {
  const started = now();
  const counts = { documentReadAttempts: 0, queryAttempts: 0, queryDocumentsReturned: 0,
    transactionAttempts: 0, committedWrites: 0, committedDeletes: 0, skippedTickWrites: 0 };
  return {
    counts,
    async transaction(db, work) {
      let committed;
      const result = await db.runTransaction(async tx => {
        counts.transactionAttempts++;
        const attempt = { writes: 0, deletes: 0 };
        const measured = {
          get(ref) { counts.documentReadAttempts++; return tx.get(ref); },
          set(...args) { attempt.writes++; tx.set(...args); return measured; },
          delete(...args) { attempt.deletes++; tx.delete(...args); return measured; },
        };
        const result = await work(measured);
        committed = attempt;
        return result;
      });
      counts.committedWrites += committed?.writes || 0;
      counts.committedDeletes += committed?.deletes || 0;
      return result;
    },
    report(operation, outcome) { return { operation, outcome, ...counts, durationMs: Math.max(0, now() - started) }; },
  };
}
