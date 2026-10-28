import Link from 'next/link'
import { formatNumber } from '@/lib/format'
import { usersHref } from '../utils/query'

const btn = 'inline-flex h-9 items-center rounded-full border border-border px-4 text-sm font-medium'

export function Pagination({ page, pageSize, total, q }: { page: number; pageSize: number; total: number; q: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)

  return (
    <nav aria-label="Paginación" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted-foreground">
        {formatNumber(from)}–{formatNumber(to)} de {formatNumber(total)}
      </p>
      <div className="flex gap-2">
        {page > 1
          ? <Link className={`${btn} hover:bg-surface-alt`} href={usersHref(page - 1, q)}>Anterior</Link>
          : <span aria-disabled className={`${btn} opacity-40`}>Anterior</span>}
        {page < pages
          ? <Link className={`${btn} hover:bg-surface-alt`} href={usersHref(page + 1, q)}>Siguiente</Link>
          : <span aria-disabled className={`${btn} opacity-40`}>Siguiente</span>}
      </div>
    </nav>
  )
}
