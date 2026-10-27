'use client'

import { ArrowRightLeft, Settings2 } from 'lucide-react'
import Link from 'next/link'
import { useFinanceAccounts, useFinanceSnapshot } from '@/features/personal-finance/hooks'
import BalanceHero from './components/BalanceHero'
import BalanceAccountsSection from './components/BalanceAccountsSection'
import BalanceDebtsSection from './components/BalanceDebtsSection'
import BalanceHouseholdSection from './components/BalanceHouseholdSection'
import BalanceTranquilityLink from './components/BalanceTranquilityLink'

export default function BalancePageContent() {
  const accounts = useFinanceAccounts()
  const snapshot = useFinanceSnapshot()
  return <div className="min-h-screen bg-[#F5F2EE] dark:bg-[#071D27]"><BalanceHero accounts={accounts.accounts} snapshot={snapshot.snapshot} loading={accounts.loading || snapshot.loading} /><main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-7 sm:px-6 sm:py-10"><BalanceAccountsSection accounts={accounts.accounts} snapshot={snapshot.snapshot} loading={accounts.loading} /><BalanceTranquilityLink /><BalanceDebtsSection accounts={accounts.accounts} snapshot={snapshot.snapshot} /><BalanceHouseholdSection /><nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-4 text-xs font-semibold text-muted-foreground"><Link href="/finanzas" className="inline-flex items-center gap-1.5 hover:text-foreground"><ArrowRightLeft className="h-3.5 w-3.5" />Transferir</Link><Link href="/settings" className="inline-flex items-center gap-1.5 hover:text-foreground"><Settings2 className="h-3.5 w-3.5" />Gestionar cuentas</Link></nav></main></div>
}
