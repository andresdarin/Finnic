import { describe, expect, it } from 'vitest'
import { latencySummary } from './latency-summary'
const at = (ms: number) => new Date(ms)
describe('operator latency measurements', () => {
  it('separates queue, processing and send without exposing message contents', () => {
    const result = latencySummary([{ createdAt: at(0), processingStartedAt: at(100), completedAt: at(600), replySentAt: at(800), attempts: 1 }])
    expect(result.queue.p50Ms).toBe(100); expect(result.processing.p95Ms).toBe(500)
    expect(result.outbound.p50Ms).toBe(200); expect(result.receivedToSent.p95Ms).toBe(800)
  })
  it('does not count interim feedback or missing timestamps as a final response', () => {
    const result = latencySummary([{ createdAt: at(0), processingStartedAt: at(100), completedAt: null, replySentAt: at(200), attempts: 2 }])
    expect(result.receivedToSent.samples).toBe(0); expect(result.receivedToSent.p95Ms).toBeNull()
    expect(result.retriedMessages).toBe(1)
  })
})
