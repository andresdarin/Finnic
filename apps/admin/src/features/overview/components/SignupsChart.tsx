'use client'

import { useState } from 'react'
import type { AdminDailyCount } from '@lovehold/shared'
import { formatDay, formatNumber } from '@/lib/format'
import { niceScale } from '../utils/chart'

const W = 720
const H = 220
const PAD = { top: 12, right: 8, bottom: 26, left: 32 }
const GAP = 2

/** Altas por día: una serie, barras ancladas a la base, tooltip por barra (hover o foco). */
export function SignupsChart({ data }: { data: AdminDailyCount[] }) {
  const [active, setActive] = useState<number | null>(null)
  const { top, steps } = niceScale(Math.max(0, ...data.map((d) => d.count)))
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom
  const slot = plotW / Math.max(1, data.length)
  const barW = Math.max(2, slot - GAP)
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH
  const point = active === null ? null : data[active]

  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Altas por día, últimos 30 días" onMouseLeave={() => setActive(null)}>
        {steps.map((s) => (
          <g key={s}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(s)} y2={y(s)} stroke="var(--border)" strokeWidth={1} strokeDasharray={s === 0 ? undefined : '2 4'} />
            <text x={PAD.left - 8} y={y(s)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">{s}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + i * slot + GAP / 2
          const h = Math.max(0, y(0) - y(d.count))
          const r = Math.min(4, barW / 2, h)
          return (
            <g key={d.date}>
              {h > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(0) - h + r} Q${x},${y(0) - h} ${x + r},${y(0) - h} H${x + barW - r} Q${x + barW},${y(0) - h} ${x + barW},${y(0) - h + r} V${y(0)} Z`}
                  fill="var(--chart)"
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              )}
              {/* Zona de hover más grande que la barra, para días con pocas altas. */}
              <rect
                x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent"
                tabIndex={0} aria-label={`${formatDay(d.date)}: ${d.count} altas`}
                onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                className="outline-none"
              />
              {i % 7 === (data.length - 1) % 7 && (
                <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-muted-foreground text-[11px]">{formatDay(d.date)}</text>
              )}
            </g>
          )
        })}
      </svg>
      {point && active !== null && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs shadow-sm"
          style={{ left: `${((PAD.left + active * slot + slot / 2) / W) * 100}%` }}
        >
          <span className="text-muted-foreground">{formatDay(point.date)}</span>{' '}
          <strong className="tabular-nums">{formatNumber(point.count)}</strong> {point.count === 1 ? 'alta' : 'altas'}
        </div>
      )}
      <table className="sr-only">
        <caption>Altas por día</caption>
        <thead><tr><th scope="col">Día</th><th scope="col">Altas</th></tr></thead>
        <tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>)}</tbody>
      </table>
    </figure>
  )
}
