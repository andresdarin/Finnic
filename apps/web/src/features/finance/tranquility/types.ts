import type { TranquilityDashboard, TranquilityConfig, TranquilityMovement, TranquilityScenario } from '@lovehold/shared/tranquility'

export type { TranquilityDashboard, TranquilityConfig, TranquilityMovement, TranquilityScenario }
export type Tab = 'gastar' | 'guardar' | 'llegar'
export type SetupValues = Omit<TranquilityConfig, 'needsBps' | 'wantsBps' | 'futureBps'> & {
  needsBps: number; wantsBps: number; futureBps: number; emergencyInitial: string; investmentInitial: string; initialAvailable: string
}
