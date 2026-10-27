import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { AuthenticatedUser } from './auth.guard'

/**
 * Solo confía en `app_metadata`: Supabase lo escribe únicamente con la service role.
 * `user_metadata` lo edita el propio usuario y el claim `role` del JWT es el rol de Postgres.
 */
export function isAdminUser(user: Partial<AuthenticatedUser> | undefined): boolean {
  const claims = user?.app_metadata
  if (!claims || typeof claims !== 'object') return false
  const role = typeof claims.role === 'string' ? claims.role.toLowerCase() : null
  return role === 'admin' || claims.admin === true
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (isAdminUser(context.switchToHttp().getRequest().user)) return true
    throw new ForbiddenException('Admin role required')
  }
}
