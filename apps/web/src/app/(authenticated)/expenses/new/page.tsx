'use client'

import { useSearchParams } from 'next/navigation'
import { useProfile } from '@/features/auth/ProfileProvider'
import ExpenseFormFields from '@/features/expenses/ExpenseFormFields'
import ExpenseItemList from '@/features/expenses/ExpenseItemList'
import ExpenseSummary from '@/features/expenses/ExpenseSummary'
import NewExpenseHeader from '@/features/expenses/NewExpenseHeader'
import ReceiptScanReviewPanel from '@/features/expenses/receipt-scan/ReceiptScanReviewPanel'
import { useExpenseForm } from '@/features/expenses/hooks'
import { useReceiptScan } from '@/features/expenses/receipt-scan/hooks'
import { scanResultToFormItems } from '@/features/expenses/receipt-scan/utils'

export default function NewExpensePage() {
  const searchParams = useSearchParams()
  const autoCamera = searchParams.get('scan') === 'camera' || searchParams.get('camera') === '1' || searchParams.get('tab') === 'scan'

  const { profile } = useProfile()
  const profileName = profile?.displayName || profile?.email || 'Tu perfil'
  const form = useExpenseForm(profileName)
  const scan = useReceiptScan()

  function applyScan() {
    if (!scan.result) return
    const formItems = scanResultToFormItems(scan.result)
    const warningsText = scan.result.warnings.length > 0 ? `Advertencias del scan:\n${scan.result.warnings.join('\n')}` : ''
    form.populateFromScan({
      merchant: scan.result.merchant ?? undefined,
      receiptDate: scan.result.receiptDate ?? undefined,
      total: scan.result.total ?? undefined,
      paymentMethod: scan.result.paymentMethod ?? undefined,
      notes: warningsText,
      items: formItems,
    })
  }

  return (
    <div className="w-full pb-10">
      {/* 1. Header / Banner Azul con Bloque de Captura Integrado */}
      <NewExpenseHeader
        preview={scan.preview}
        scanning={scan.scanning}
        onFileSelect={scan.selectFile}
        onScan={scan.submitScan}
        onClear={scan.clear}
        autoCamera={autoCamera}
      />

      {/* Contenido en Surface Clara: Revisión del Escaneo, Formulario y Resumen */}
      <div className="w-full max-w-xl mx-auto px-3.5 sm:px-4 pt-4 sm:pt-5 space-y-4 lg:max-w-6xl lg:px-8">
        {/* Error de escaneo si existe */}
        {scan.error && (
          <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-xs font-semibold text-danger">
            {scan.error}
          </div>
        )}

        {/* 2. Bloque de Revisión del Escaneo */}
        <ReceiptScanReviewPanel
          result={scan.result}
          scanning={scan.scanning}
          onClear={scan.clear}
          onApply={applyScan}
        />

        {/* 3, 4 & 5. Datos del Egreso, Lista de Productos y Resumen Final con CTA */}
        <form
          onSubmit={(e) => { e.preventDefault(); form.handleSubmit() }}
          className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6 lg:space-y-0"
        >
          {/* Desktop: datos e ítems a la izquierda, resumen y Guardar fijos a la derecha */}
          <div className="space-y-4">
            <ExpenseFormFields
              form={form.form}
              profileName={profileName}
              onUpdate={form.updateForm}
            />

            <ExpenseItemList
              items={form.items}
              onAddItem={form.addItem}
              onRemoveItem={form.removeItem}
              onUpdateItem={form.updateItem}
              onUseItemsTotal={form.useItemsTotalAsAmount}
            />
          </div>

          <div className="lg:sticky lg:top-6">
            <ExpenseSummary
              itemsTotal={form.itemsTotal}
              declaredTotal={form.declaredTotal}
              discounts={scan.result?.discounts ?? 0}
              difference={form.difference}
              hasBlockingDifference={form.hasBlockingDifference}
              isSupermarketExpense={form.isSupermarketExpense}
              itemsCount={form.items.length}
              canSubmit={form.canSubmit}
              isSubmitting={form.isSubmitting}
              error={form.error}
              success={form.success}
              onSubmit={form.handleSubmit}
              onGoToMovements={form.goToMovements}
            />
          </div>
        </form>
      </div>
    </div>
  )
}
