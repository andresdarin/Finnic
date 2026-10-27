'use client'

import { Pencil, Trash2 } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { ITEM_CATEGORIES } from '../constants'
import type { ExpenseItemForm } from '../types'

const inputClass = 'h-9 w-full rounded-lg border border-transparent bg-transparent hover:bg-surface-soft/60 hover:border-border/40 focus:bg-surface-soft focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20 px-2 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground/60'

const numberInputClass = 'h-9 w-full rounded-lg border border-transparent bg-transparent hover:bg-surface-soft/60 hover:border-border/40 focus:bg-surface-soft focus:border-primary/80 focus:outline-none focus:ring-2 focus:ring-primary/20 px-2 text-sm font-bold text-foreground text-right tabular-nums transition-all placeholder:text-muted-foreground/60 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

export default function ExpenseItemsTable({
  items, onUpdateItem, onRemoveItem, onEditItem,
}: {
  items: ExpenseItemForm[]
  onUpdateItem: (id: string, field: keyof ExpenseItemForm, value: string) => void
  onRemoveItem: (id: string) => void
  onEditItem: (id: string) => void
}) {
  return (
    <div className={`hidden lg:block ${items.length > 6 ? 'scrollbar-salmon max-h-[384px] overflow-y-auto pr-1' : ''}`}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
        <colgroup>
          <col className="w-[30%]" />
          <col className="w-[18%]" />
          <col className="w-[10%]" />
          <col className="w-[10%]" />
          <col className="w-[11%]" />
          <col className="w-[11%]" />
          <col className="w-[10%]" />
        </colgroup>
        <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md">
          <tr className="border-b border-border text-xs font-bold text-muted-foreground">
            <th className="border-b border-border px-3 py-3.5 text-left font-bold tracking-wide">Producto</th>
            <th className="border-b border-border px-3 py-3.5 text-left font-bold tracking-wide">Categoría</th>
            <th className="border-b border-border px-3 py-3.5 text-right font-bold tracking-wide">Cantidad</th>
            <th className="border-b border-border px-3 py-3.5 text-left font-bold tracking-wide">Unidad</th>
            <th className="border-b border-border px-3 py-3.5 text-right font-bold tracking-wide">Unitario</th>
            <th className="border-b border-border px-3 py-3.5 text-right font-bold tracking-wide">Total</th>
            <th className="border-b border-border px-3 py-3.5 text-right font-bold tracking-wide">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {items.map((item, index) => (
            <tr key={item.localId} className="h-14 hover:bg-surface-soft/20 transition-colors group">
              <td className="px-1 py-1.5">
                <label className="block">
                  <span className="sr-only">Producto {index + 1}</span>
                  <input className={inputClass} value={item.name} required placeholder="Nombre del producto"
                    onChange={(event) => onUpdateItem(item.localId, 'name', event.target.value)} />
                </label>
              </td>
              <td className="px-1 py-1.5">
                <div className="block">
                  <span className="sr-only">Categoría de {item.name || `producto ${index + 1}`}</span>
                  <CustomSelect
                    className="!h-9 !px-2 !rounded-lg !border-transparent !bg-transparent hover:!bg-surface-soft/60 focus:!bg-surface-soft focus:!border-primary/80"
                    value={item.itemCategory}
                    options={ITEM_CATEGORIES}
                    onChange={(val) => onUpdateItem(item.localId, 'itemCategory', val)}
                    placeholder="Categoría"
                  />
                </div>
              </td>
              <td className="px-1 py-1.5 text-right">
                <div className="inline-flex items-center justify-end rounded-lg border border-transparent bg-transparent hover:bg-surface-soft/60 hover:border-border/40 focus-within:bg-surface-soft focus-within:border-primary/80 transition-all p-0.5 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(item.quantity) || 0
                      onUpdateItem(item.localId, 'quantity', String(Math.max(0, current - 1)))
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm font-bold"
                    aria-label="Disminuir cantidad"
                  >
                    -
                  </button>
                  <label className="block flex-1 min-w-0">
                    <span className="sr-only">Cantidad de {item.name || `producto ${index + 1}`}</span>
                    <input
                      className="h-8 w-full bg-transparent text-center font-bold text-foreground text-sm focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-0"
                      type="number"
                      step="0.001"
                      min="0"
                      value={item.quantity}
                      onChange={(event) => onUpdateItem(item.localId, 'quantity', event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const current = parseFloat(item.quantity) || 0
                      onUpdateItem(item.localId, 'quantity', String(current + 1))
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground transition focus:outline-none focus:ring-1 focus:ring-primary/30 text-sm font-bold"
                    aria-label="Aumentar cantidad"
                  >
                    +
                  </button>
                </div>
              </td>
              <td className="px-1 py-1.5">
                <label className="block">
                  <span className="sr-only">Unidad de {item.name || `producto ${index + 1}`}</span>
                  <input className={inputClass} value={item.unit} placeholder="un"
                    onChange={(event) => onUpdateItem(item.localId, 'unit', event.target.value)} />
                </label>
              </td>
              <td className="px-1 py-1.5">
                <label className="block">
                  <span className="sr-only">Precio unitario de {item.name || `producto ${index + 1}`}</span>
                  <input className={numberInputClass} type="number" min="0" step="0.01" value={item.unitPrice} placeholder="0.00"
                    onChange={(event) => onUpdateItem(item.localId, 'unitPrice', event.target.value)} />
                </label>
              </td>
              <td className="px-1 py-1.5">
                <label className="block">
                  <span className="sr-only">Precio total de {item.name || `producto ${index + 1}`}</span>
                  <input className={numberInputClass} type="number" min="0" step="0.01" value={item.total} required placeholder="0.00"
                    onChange={(event) => onUpdateItem(item.localId, 'total', event.target.value)} />
                </label>
              </td>
              <td className="px-1 py-1.5">
                <div className="flex justify-end gap-1 opacity-25 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-surface-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus:opacity-100"
                    onClick={() => onEditItem(item.localId)}
                    aria-label={`Editar ${item.name || 'producto'}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/30 focus:opacity-100"
                    onClick={() => onRemoveItem(item.localId)}
                    aria-label={`Eliminar ${item.name || 'producto'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
