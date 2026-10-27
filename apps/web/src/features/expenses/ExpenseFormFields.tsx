import { Users, User, Receipt, CreditCard, Calendar, Store, Tag, DollarSign } from 'lucide-react'
import CustomDatePicker from '@/components/ui/CustomDatePicker'
import type { ExpenseForm } from './types'

export default function ExpenseFormFields({
  form, profileName, onUpdate,
}: {
  form: ExpenseForm
  profileName?: string
  onUpdate: (field: keyof ExpenseForm, value: string) => void
}) {
  const isPersonal = form.scope === 'personal'

  return (
    <div className="neu-raised rounded-3xl border border-border/50 bg-surface p-4 sm:p-5 transition-all flex flex-col gap-4 select-none">
      {/* Header del bloque */}
      <div className="pb-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
            <Receipt className="h-3.5 w-3.5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground">Datos del egreso</h2>
            <p className="text-[11px] text-muted-foreground">Completá los detalles del movimiento financiero.</p>
          </div>
        </div>
      </div>

      {/* Switch de Alcance: Personal vs En pareja */}
      <div className="flex h-11 gap-1 rounded-2xl border border-border/80 bg-surface-soft p-1">
        <button
          type="button"
          onClick={() => onUpdate('scope', 'personal')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
            isPersonal 
              ? 'bg-primary text-primary-foreground shadow-xs' 
              : 'text-muted-foreground hover:text-foreground bg-transparent'
          }`}
        >
          <User className="h-3.5 w-3.5" />
          Personal
        </button>
        <button
          type="button"
          onClick={() => onUpdate('scope', 'household')}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-all ${
            !isPersonal 
              ? 'bg-primary text-primary-foreground shadow-xs' 
              : 'text-muted-foreground hover:text-foreground bg-transparent'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          En pareja (50/50{profileName ? ` · ${profileName}` : ''})
        </button>
      </div>

      {/* Campos del Egreso */}
      <div className="flex flex-col gap-3.5">
        {/* Total declarado con protagonismo Navy */}
        <label className="block">
          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
            <DollarSign className="h-3.5 w-3.5 text-[#A58D66]" />
            Total del egreso <span aria-hidden="true" className="text-danger">*</span>
          </span>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(e) => onUpdate('amount', e.target.value)}
              placeholder="0.00"
              required
              className="neu-inset h-12 w-full rounded-2xl border border-border/50 bg-[#C0D5D6]/10 dark:bg-surface-soft px-4 text-base font-extrabold text-primary dark:text-primary-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>
        </label>

        {/* Comercio y Título */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
              <Store className="h-3.5 w-3.5 text-primary" />
              Comercio
            </span>
            <input
              type="text"
              value={form.merchant}
              onChange={(e) => onUpdate('merchant', e.target.value)}
              placeholder="Ej: Disco, Devoto, Ancap..."
              className="neu-inset h-11 w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              Concepto / Título <span aria-hidden="true" className="text-danger">*</span>
            </span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onUpdate('title', e.target.value)}
              placeholder="Ej: Compra del mes"
              required
              className="neu-inset h-11 w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
            />
          </label>
        </div>

        {/* Categoría y Medio de pago */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
              <Tag className="h-3.5 w-3.5 text-[#407E8C]" />
              Categoría <span aria-hidden="true" className="text-danger">*</span>
            </span>
            <input
              type="text"
              value={form.category}
              onChange={(e) => onUpdate('category', e.target.value)}
              placeholder="Ej: Supermercado, Salidas..."
              required
              className="neu-inset h-11 w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
            />
          </label>

          <label className="block">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
              <CreditCard className="h-3.5 w-3.5 text-primary" />
              Medio de pago / Cuenta
            </span>
            <input
              type="text"
              value={form.paymentMethod}
              onChange={(e) => onUpdate('paymentMethod', e.target.value)}
              placeholder="Ej: Débito Itaú, Efectivo, Crédito..."
              className="neu-inset h-11 w-full rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
            />
          </label>
        </div>

        {/* Fecha */}
        <div className="block">
          <span className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            Fecha del gasto <span aria-hidden="true" className="text-danger">*</span>
          </span>
          <CustomDatePicker
            className="neu-inset w-full text-base sm:text-sm font-medium h-11 rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 text-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
            value={form.date}
            onChange={(v) => onUpdate('date', v)}
            label="Fecha del gasto"
            required
          />
        </div>

        {/* Notas adicionales */}
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground mb-1.5 block">Notas adicionales</span>
          <textarea
            value={form.notes} 
            onChange={(e) => onUpdate('notes', e.target.value)}
            placeholder="Detalles útiles para recordar esta compra..."
            rows={2}
            className="neu-inset min-h-[64px] w-full resize-none rounded-2xl border border-border/50 bg-surface-soft/60 px-3.5 py-2.5 text-base sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:bg-surface focus:outline-none transition-all"
          />
        </label>
      </div>
    </div>
  )
}
