import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { isAdminAppMetadata } from '@lovehold/shared'
import type { AuthenticatedUser } from './auth.guard'

/**
 * Solo confía en `app_metadata` (regla en `@lovehold/shared`).
 * `user_metadata` lo edita el propio usuario y el claim `role` del JWT es el rol de Postgres.
 */
export function isAdminUser(user: Partial<AuthenticatedUser> | undefined): boolean {
  return isAdminAppMetadata(user?.app_metadata)
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (isAdminUser(context.switchToHttp().getRequest().user)) return true
    throw new ForbiddenException('Admin role required')
  }
}
