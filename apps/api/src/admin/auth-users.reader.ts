import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

/**
 * Lee `auth.users` de Supabase (solo `id` y `last_sign_in_at`).
 * Si el rol de la base no tiene permiso sobre el esquema `auth`, devuelve `null`
 * en vez de romper el panel: las métricas de actividad quedan como "sin dato".
 */
@Injectable()
export class AuthUsersReader {
  private readonly logger = new Logger(AuthUsersReader.name)

  constructor(private readonly prisma: PrismaService) {}

  async countActiveSince(since: Date): Promise<number | null> {
    try {
      const [row] = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*)::bigint AS count FROM auth.users u
        JOIN "Profile" p ON p."authUserId" = u.id::text
        WHERE u.last_sign_in_at >= ${since}`
      return Number(row?.count ?? 0)
    } catch (error) {
      this.warn(error)
      return null
    }
  }

  async lastSignIns(authUserIds: string[]): Promise<Map<string, Date | null> | null> {
    if (authUserIds.length === 0) return new Map()
    try {
      const rows = await this.prisma.$queryRaw<Array<{ id: string; last_sign_in_at: Date | null }>>`
        SELECT id::text AS id, last_sign_in_at FROM auth.users
        WHERE id::text IN (${Prisma.join(authUserIds)})`
      return new Map(rows.map((row) => [row.id, row.last_sign_in_at]))
    } catch (error) {
      this.warn(error)
      return null
    }
  }

  private warn(error: unknown) {
    // Sin detalles de conexión: solo el tipo de fallo.
    this.logger.warn(`auth.users unavailable: ${error instanceof Error ? error.name : 'unknown'}`)
  }
}
