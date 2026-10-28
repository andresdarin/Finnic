import type { ZodSchema } from 'zod'
import type { FunctionDeclaration } from '../client/gemini.types'

/** Request-scoped capabilities supplied by the authenticated intake, never by a client DTO. */
export type ScopedDraftTool = {
  declaration: FunctionDeclaration
  schema: ZodSchema
  execute: (args: Record<string, unknown>) => Promise<{ data?: unknown; reply?: string }>
}
export type ScopedDraftTools = Record<'get_pending_expense' | 'update_pending_expense', ScopedDraftTool>
