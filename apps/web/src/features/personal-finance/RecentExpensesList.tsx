'use client'

import React, { useState } from 'react'
import {
  ShoppingCart,
  Zap,
  Home,
  Tag,
  Receipt,
  ArrowUp,
  ArrowLeftRight,
  CreditCard,
} from 'lucide-react'
import { formatCurrency, formatDate, CATEGORY_LABELS } from './constants'
import type { PersonalExpense } from './types'

interface RecentExpensesListProps {
  expenses: PersonalExpense[]
}

function getMovementIcon(exp: PersonalExpense) {
  if (exp.movementType === 'INCOME') {
    return <ArrowUp className="h-4 w-4 text-emerald-400" />
  }
  if (exp.movementType === 'TRANSFER') {
    return <ArrowLeftRight className="h-4 w-4 text-primary" />
  }
  if (exp.financeAccount?.type === 'CREDIT') {
    return <CreditCard className="h-4 w-4 text-amber-400" />
  }

  const cat = exp.category.toLowerCase()
  if (cat === 'supermercado' || cat === 'supermarket') {
    return <ShoppingCart className="h-4 w-4" />
  }
  if (
    ['ute', 'ose', 'antel', 'internet', 'gastos_comunes', 'servicios', 'services', 'salud'].includes(
      cat,
    )
  ) {
    return <Zap className="h-4 w-4" />
  }
  if (cat === 'alquiler' || cat === 'rental') {
    return <Home className="h-4 w-4" />
  }
  return <Tag className="h-4 w-4" />
}

export default function RecentExpensesList({ expenses }: RecentExpensesListProps) {
  const [showAll, setShowAll] = useState(false)

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center bg-transparent">
        <Receipt className="h-8 w-8 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No hay movimientos este mes</p>
      </div>
    )
  }

  const displayedExpenses = showAll ? expenses : expenses.slice(0, 10)

  return (
    <div className="flex flex-col gap-3">
      {displayedExpenses.map((exp) => {
        const isIncome = exp.movementType === 'INCOME'
        const isTransfer = exp.movementType === 'TRANSFER'
        const accountName =
          isTransfer && exp.financeAccount && exp.destinationAccount
            ? `${exp.financeAccount.name} → ${exp.destinationAccount.name}`
            : exp.financeAccount?.name

        return (
          <div
            key={exp.id}
            className="flex items-center gap-3 bg-transparent pb-3 border-b-[0.5px] border-border/50 last:border-b-0 last:pb-0"
          >
            {/* Ícono contextual */}
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                isIncome
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : isTransfer
                  ? 'border-primary/30 bg-primary/10'
                  : exp.financeAccount?.type === 'CREDIT'
                  ? 'border-amber-500/30 bg-amber-500/10'
                  : 'border-border bg-surface-soft text-foreground/80'
              }`}
            >
              {getMovementIcon(exp)}
            </div>

            {/* Columna central */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">
                  {exp.merchant || exp.title}
                </p>
                {accountName && (
                  <span className="shrink-0 rounded-md bg-surface-soft px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {accountName}
                  </span>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground mt-0.5">
                {CATEGORY_LABELS[exp.category] ?? exp.category} · {formatDate(exp.date)}
              </p>
              {exp.category === 'CAMBIO_MONEDA' && exp.notes && (
                <p className="text-[10px] text-[#A58D66] font-medium truncate mt-0.5">
                  {exp.notes}
                </p>
              )}
            </div>

            {/* Monto a la derecha */}
            <p
              className={`shrink-0 text-sm font-bold tabular-nums ${
                isIncome
                  ? 'text-[#2E7D6A] dark:text-[#4BE3B5]'
                  : isTransfer
                  ? 'text-foreground'
                  : 'text-primary'
              }`}
            >
              {(() => {
                const isUSD = exp.currency === 'USD'
                const formatted = isUSD
                  ? `US$ ${exp.amount.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : formatCurrency(exp.amount)

                return isIncome ? `+${formatted}` : isTransfer ? formatted : `-${formatted}`
              })()}
            </p>
          </div>
        )
      })}

      {expenses.length > 10 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full text-center py-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors focus:outline-none"
        >
          Ver más
        </button>
      )}
    </div>
  )
}
