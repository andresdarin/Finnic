import type { SimulationResult } from '@lovehold/shared/tranquility-engine'

export type SimulatorInputs = {
  name: string
  initialCapital: string
  monthlyContribution: string
  annualReturnPct: string
  annualInflationPct: string
  years: string
  contributionGrowthPct: string
  targetCapital: string
}

export type ScenarioSet = {
  conservative: SimulationResult
  base: SimulationResult
  optimistic: SimulationResult
}

export type SavedSimulatorScenario = Omit<SimulatorInputs, 'annualReturnPct' | 'years' | 'annualInflationPct' | 'contributionGrowthPct'> & {
  id: string
  annualReturnPct: number
  annualInflationPct: number
  years: number
  contributionGrowthPct: number
}
