'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import IncomeFormModal from '@/features/personal-finance/IncomeFormModal'
import TransferFormModal from '@/features/personal-finance/TransferFormModal'
import CurrencyExchangeModal from '@/features/personal-finance/CurrencyExchangeModal'
import type { NewActionType } from './constants'

type ModalAction = Extract<NewActionType, 'income' | 'transfer' | 'exchange'>
const NewActionContext = createContext<((type: NewActionType) => void) | null>(null)

/**
 * Ejecuta las operaciones de "Nuevo" desde cualquier punto del shell (ADR-003).
 * Gasto y escaneo navegan al alta; el resto abre su modal, que vive una sola vez acá.
 */
export function NewActionProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalAction | null>(null)
  const close = () => setModal(null)

  const runAction = useCallback((type: NewActionType) => {
    if (type === 'expense') router.push('/expenses/new')
    else if (type === 'scan') router.push('/expenses/new?tab=scan')
    else setModal(type)
  }, [router])

  return (
    <NewActionContext.Provider value={runAction}>
      {children}
      {/* Montados solo mientras están abiertos: cada uno pide las cuentas al montarse. */}
      {modal === 'income' && <IncomeFormModal isOpen onClose={close} />}
      {modal === 'transfer' && <TransferFormModal isOpen onClose={close} />}
      {modal === 'exchange' && <CurrencyExchangeModal isOpen onClose={close} />}
    </NewActionContext.Provider>
  )
}

export function useNewAction() {
  const runAction = useContext(NewActionContext)
  if (!runAction) throw new Error('useNewAction debe usarse dentro de NewActionProvider')
  return runAction
}
