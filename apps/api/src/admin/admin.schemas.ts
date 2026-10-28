import { z } from 'zod'

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  q: z.string().trim().max(100).optional().transform((value) => value || undefined),
})

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>

/** Ids de Profile son cuid: letras minúsculas y dígitos. */
export const adminUserIdSchema = z.string().regex(/^[a-z0-9]{10,40}$/)
