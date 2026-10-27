import { useState } from 'react'
import { ShoppingBasket, PackageOpen, Plus, Check } from 'lucide-react'
import { money, sumItems } from './constants'
import ExpenseItemEditDrawer from './expense-items/ExpenseItemEditDrawer'
import ExpenseItemsMobileList from './expense-items/ExpenseItemsMobileList'
import ExpenseItemsTable from './expense-items/ExpenseItemsTable'
import type { ExpenseItemForm } from './types'

export default function ExpenseItemList({
  items, onAddItem, onRemoveItem, onUpdateItem, onUseItemsTotal,
}: {
  items: ExpenseItemForm[]
  onAddItem: () => void
  onRemoveItem: (id: string) => void
  onUpdateItem: (id: string, field: keyof ExpenseItemForm, value: string) => void
  onUseItemsTotal: () => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingItem = items.find((item) => item.localId === editingId) ?? null

  const itemsTotal = sumItems(items)

  function removeItem(id: string) {
    onRemoveItem(id)
    if (editingId === id) setEditingId(null)
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-surface p-4 sm:p-5 shadow-xs transition-all flex flex-col gap-3.5 select-none">
      {/* Header en una fila con Badge */}
      <div className="pb-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
            <ShoppingBasket className="h-3.5 w-3.5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground">Productos del comprobante</h2>
            <p className="text-[11px] text-muted-foreground">Ítems discriminados detectados o agregados.</p>
          </div>
        </div>
        <span className="text-[11px] font-bold text-muted-foreground bg-surface-soft border border-border/80 px-2.5 py-0.5 rounded-full">
          {items.length} {items.length === 1 ? 'ítem' : 'ítems'}
        </span>
      </div>

      {/* Contenido / Listado de Productos */}
      <div>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center bg-transparent gap-2 select-none">
            <PackageOpen className="h-7 w-7 text-muted-foreground" />
            <p className="text-xs font-bold text-foreground">Sin productos discriminados</p>
            <p className="text-[11px] text-muted-foreground max-w-[260px]">
              Podés registrar el egreso con el total general o agregar ítems manualmente.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            <ExpenseItemsTable
              items={items}
              onUpdateItem={onUpdateItem}
              onRemoveItem={removeItem}
              onEditItem={setEditingId}
            />
            <ExpenseItemsMobileList
              items={items}
              onRemoveItem={removeItem}
              onEditItem={setEditingId}
            />
          </div>
        )}
      </div>

      {/* Botones de acción de productos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {/* Botón Agregar producto */}
        <button
          type="button"
          onClick={onAddItem}
          className="w-full flex items-center justify-center gap-1.5 h-11 rounded-2xl border border-border/80 bg-surface-soft text-xs font-bold text-foreground hover:bg-surface transition-colors focus:outline-none"
        >
          <Plus className="h-3.5 w-3.5 text-muted-foreground" />
          Agregar producto
        </button>

        {/* Botón "Usar $X,XX" si hay ítems */}
        {items.length > 0 && (
          <button
            type="button"
            onClick={onUseItemsTotal}
            className="w-full flex items-center justify-center gap-1.5 h-11 rounded-2xl bg-surface-soft border border-primary/30 text-xs font-bold text-primary hover:bg-primary/5 transition-all focus:outline-none active:scale-[0.98]"
          >
            <Check className="h-3.5 w-3.5" />
            Usar suma ({money(itemsTotal)})
          </button>
        )}
      </div>

      <ExpenseItemEditDrawer
        item={editingItem}
        onClose={() => setEditingId(null)}
        onUpdateItem={onUpdateItem}
        onRemoveItem={removeItem}
      />
    </section>
  )
}
