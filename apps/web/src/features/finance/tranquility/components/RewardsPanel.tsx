'use client'

import { useState } from 'react'
import type { RewardsResponse } from '../goalsTypes'
import { useAuthedResource } from '../hooks/useAuthedResource'
import { decimal, money } from '../utils'
import { Button, Card, Field, SectionTitle } from './Primitives'

const PATH = '/api/rewards'
const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)

/** Points for saving habits, redeemable only for treats that fit the leisure budget. */
export function RewardsPanel() {
  const { data, error, busy, mutate } = useAuthedResource<RewardsResponse>(PATH)
  const [form, setForm] = useState({ name: '', points: '', price: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const create = async () => {
    const price = decimal(form.price)
    const points = Number(form.points)
    if (!form.name.trim() || !price || price === '0.00' || !Number.isInteger(points) || points < 1) { setFormError('Completá nombre, puntos y precio.'); return }
    setFormError(null)
    if (await mutate(`${PATH}/items`, 'POST', { name: form.name.trim(), pointsCost: points, priceAmount: price })) setForm({ name: '', points: '', price: '' })
  }
  return <Card>
    <SectionTitle eyebrow="FINNIC REWARDS" title={`${data?.balance ?? 0} puntos`} detail="Los puntos no son dinero. Un canje solo habilita un gusto que entre en tu presupuesto de gustos disponible y nunca usa emergencia ni ahorro comprometido." />
    {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <div><h3 className="text-sm font-semibold">Cómo se ganan</h3><ul className="mt-2 space-y-1 text-sm text-muted-foreground">{data?.rules.map(rule => <li key={rule}>• {rule} pts</li>)}</ul>
        <h3 className="mt-4 text-sm font-semibold">Historial</h3><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-sm">{data?.entries.length ? data.entries.map(entry => <li key={entry.id} className="flex justify-between gap-2"><span>{entry.description}</span><strong className={entry.points > 0 ? 'text-success' : 'text-muted-foreground'}>{entry.points > 0 ? '+' : ''}{entry.points}</strong></li>) : <li className="text-muted-foreground">Todavía no ganaste puntos.</li>}</ul></div>
      <div><h3 className="text-sm font-semibold">Tus gustos</h3><ul className="mt-2 space-y-2">{data?.items.map(item => <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3 text-sm"><span>{item.name}<span className="block text-xs text-muted-foreground">{item.pointsCost} pts · hasta {money(item.priceAmount, item.currency)}</span></span><Button disabled={busy || (data.balance < item.pointsCost)} onClick={() => void mutate(`${PATH}/items/${item.id}/redeem`, 'POST', { idempotencyKey: newKey() })}>Canjear</Button></li>)}</ul>
        <div className="mt-3 grid gap-2 sm:grid-cols-3"><Field label="Gusto" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /><Field label="Puntos" value={form.points} inputMode="numeric" onChange={event => setForm({ ...form, points: event.target.value })} /><Field label="Precio" value={form.price} inputMode="decimal" onChange={event => setForm({ ...form, price: event.target.value })} error={formError ?? undefined} /></div>
        <Button className="mt-2" variant="quiet" disabled={busy} onClick={() => void create()}>Agregar gusto</Button></div>
    </div>
  </Card>
}
