import { AlertTriangle, CheckCircle2, ReceiptText, Save, ArrowRight } from 'lucide-react'
import { money } from './constants'

export default function ExpenseSummary({
  itemsTotal, declaredTotal, discounts, difference, hasBlockingDifference, isSupermarketExpense,
  itemsCount, canSubmit, isSubmitting, error, success,
  onSubmit, onGoToMovements,
}: {
  itemsTotal: number; declaredTotal: number; discounts: number; difference: number
  hasBlockingDifference: boolean; isSupermarketExpense?: boolean
  itemsCount: number; canSubmit: boolean; isSubmitting: boolean
  error: string | null; success: string | null
  onSubmit: () => void
  onGoToMovements: () => void
}) {
  const hasItems = itemsCount > 0
  const hasAnyDifference = hasItems && Math.abs(difference) > 0
  const statusText = hasBlockingDifference
    ? 'La suma de productos no coincide con el total declarado.'
    : hasAnyDifference
      ? 'Diferencia dentro del margen de redondeo permitido.'
      : hasItems
        ? 'Los productos coinciden exactamente con el total declarado.'
        : 'Podés guardar el egreso general sin discriminar productos.'

  return (
    <aside className="neu-raised rounded-3xl border border-border/50 bg-surface p-4 sm:p-5 transition-all flex flex-col gap-4 select-none">
      {/* Header */}
      <div className="pb-3 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-primary">
            <ReceiptText className="h-3.5 w-3.5 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-foreground">Resumen del egreso</h2>
            <p className="text-[11px] text-muted-foreground">Revisión previa a la confirmación.</p>
          </div>
        </div>
      </div>

      {/* Lista de Filas del Resumen con Franja Finnic */}
      <div className="rounded-2xl border border-[#407E8C]/20 bg-[#083A4F]/5 dark:bg-[#083A4F]/25 p-3.5 flex flex-col">
        <SummaryRow label="Total declarado" value={money(declaredTotal)} highlight />
        <SummaryRow label="Suma de productos" value={money(itemsTotal)} />
        {discounts > 0 && <SummaryRow label="Descuentos" value={`-${money(discounts)}`} />}
        {hasItems && (
          <SummaryRow label="Diferencia por redondeo" value={money(difference)} danger={hasBlockingDifference} />
        )}
      </div>

      {/* Mensaje de estado */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground px-0.5">
        {hasBlockingDifference ? (
          <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
        )}
        <span className="text-[11px] font-medium leading-tight">{statusText}</span>
      </div>

      {isSupermarketExpense && itemsCount === 0 && (
        <div className="text-[11px] text-muted-foreground p-3 rounded-2xl bg-surface-soft/60 border border-border/60 select-none leading-relaxed">
          Para compras de súper podés discriminar productos para análisis detallado por categoría.
        </div>
      )}

      {error && (
        <div className="flex gap-2.5 rounded-2xl border border-danger/30 bg-danger/5 p-3 text-xs text-danger font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="space-y-2">
          <div className="flex gap-2.5 rounded-2xl border border-success/30 bg-success/5 p-3 text-xs text-success font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
          <button 
            type="button" 
            onClick={onGoToMovements}
            className="flex w-full items-center justify-center gap-1.5 h-11 rounded-2xl border border-border/80 bg-surface-soft text-xs font-bold text-foreground hover:bg-surface transition-colors focus:outline-none"
          >
            Ver en movimientos
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {!canSubmit && !isSubmitting && !success && (
        <p id="expense-submit-hint" className="text-center text-xs text-muted-foreground">
          Completá los campos marcados con <span aria-hidden="true" className="text-danger">*</span><span className="sr-only">asterisco</span> para confirmar.
        </p>
      )}

      {/* CTA Principal: Confirmar Egreso (Navy Sólido Finnic) */}
      <button
        type="submit"
        disabled={!canSubmit || isSubmitting}
        aria-describedby={!canSubmit && !success ? 'expense-submit-hint' : undefined}
        onClick={onSubmit}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-[#083A4F] hover:bg-[#062c3c] text-white dark:bg-[#C0D5D6] dark:hover:bg-[#a8c6c8] dark:text-[#083A4F] text-xs sm:text-sm font-extrabold shadow-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer"
      >
        <Save className="h-4 w-4" />
        {isSubmitting ? 'Confirmando egreso…' : 'Confirmar egreso'}
      </button>
    </aside>
  )
}

function SummaryRow({ label, value, danger = false, highlight = false }: { label: string; value: string; danger?: boolean; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 py-2 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-xs sm:text-sm font-extrabold tabular-nums ${danger ? 'text-danger' : highlight ? 'text-primary dark:text-[#C0D5D6]' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  )
}
