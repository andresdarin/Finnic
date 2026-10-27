type Row = { createdAt: Date; processingStartedAt: Date | null; completedAt: Date | null; replySentAt: Date | null; attempts: number }
const distribution = (values: number[]) => {
  const sorted = values.filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b)
  const percentile = (p: number) => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)]! : null
  return { samples: sorted.length, p50Ms: percentile(.5), p95Ms: percentile(.95) }
}
/** Server timestamps only: does not pretend to measure cold start before webhook receipt. */
export function latencySummary(rows: Row[]) {
  const delta = (a: Date | null, b: Date | null) => a && b ? a.getTime() - b.getTime() : NaN
  return {
    window: 'latest_100_inbound', excludes: 'Render cold start before webhook receipt; client/network and Meta delivery after send',
    retriedMessages: rows.filter(r => r.attempts > 1).length,
    queue: distribution(rows.map(r => delta(r.processingStartedAt, r.createdAt))),
    processing: distribution(rows.map(r => delta(r.completedAt, r.processingStartedAt))),
    outbound: distribution(rows.map(r => delta(r.replySentAt, r.completedAt))),
    receivedToSent: distribution(rows.map(r => r.completedAt && r.replySentAt && r.replySentAt >= r.completedAt ? delta(r.replySentAt, r.createdAt) : NaN)),
  }
}
