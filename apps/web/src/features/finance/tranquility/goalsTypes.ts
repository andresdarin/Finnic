import type { TranquilityCurrency } from '@lovehold/shared/tranquility'

export interface CapitalGoal {
  id: string
  name: string
  currency: TranquilityCurrency
  status: 'ACTIVE' | 'COMPLETED'
  targetAmount: string
  allocatedAmount: string
  targetDate: string
  shortfall: string
  monthsRemaining: number
  requiredMonthly: string | null
  progressPct: number
  overdue: boolean
}

export interface CapitalGoalsResponse {
  currency: TranquilityCurrency
  investmentBalance: string
  allocated: string
  unallocated: string
  overAllocated: boolean
  goals: CapitalGoal[]
}

export interface RewardsResponse {
  balance: number
  entries: Array<{ id: string; kind: 'EARN' | 'REDEEM'; points: number; description: string; createdAt: string }>
  items: Array<{ id: string; name: string; pointsCost: number; priceAmount: string; currency: TranquilityCurrency }>
  rules: string[]
}
