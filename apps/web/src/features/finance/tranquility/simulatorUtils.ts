import { simulateScenarios, type SimulationResult } from '@lovehold/shared/tranquility-engine'
import { decimal } from './utils'
import type { ScenarioSet, SimulatorInputs } from './simulatorTypes'

const finiteRate = (value: string) => {
  const number = Number(value)
  return Number.isFinite(number) && number > -100 && number <= 100000
}

export function validateSimulatorInputs(input: SimulatorInputs) {
  const moneyFields = ['initialCapital', 'monthlyContribution', 'targetCapital'] as const
  if (moneyFields.some(field => !decimal(input[field]))) return 'Usá importes válidos, con hasta dos decimales.'
  if (!['annualReturnPct', 'annualInflationPct', 'contributionGrowthPct'].every(field => finiteRate(input[field as keyof SimulatorInputs]))) return 'Las tasas deben ser números finitos mayores a -100%.'
  const years = Number(input.years)
  if (!Number.isInteger(years) || years < 0 || years > 100) return 'Los años deben ser un número entero entre 0 y 100.'
  if (!input.name.trim() || input.name.trim().length > 80) return 'El nombre debe tener entre 1 y 80 caracteres.'
  return null
}

export function deriveSimulator(input: SimulatorInputs): { data: ScenarioSet | null; error: string | null } {
  const error = validateSimulatorInputs(input)
  if (error) return { data: null, error }
  try {
    const base = {
      initialCapital: decimal(input.initialCapital)!, monthlyContribution: decimal(input.monthlyContribution)!,
      annualInflationPct: Number(input.annualInflationPct), years: Number(input.years),
      contributionGrowthPct: Number(input.contributionGrowthPct), targetCapital: decimal(input.targetCapital)!,
    }
    return {
      data: simulateScenarios(base, {
        conservative: Number(input.annualReturnPct) - 2,
        base: Number(input.annualReturnPct), optimistic: Number(input.annualReturnPct) + 2,
      }) as ScenarioSet, error: null,
    }
  } catch {
    return { data: null, error: 'No se pudo calcular esta hipótesis. Revisá los valores y su magnitud.' }
  }
}

export function chartRows(scenarios: ScenarioSet, nominal: boolean, inflation = 0) {
  return scenarios.base.points.map((point, index) => ({
    year: point.year, contributed: Number(point.contributed), growth: Number(point.growth),
    conservative: Number(nominal ? scenarios.conservative.points[index]!.total : scenarios.conservative.points[index]!.realTotal),
    base: Number(nominal ? point.total : point.realTotal),
    optimistic: Number(nominal ? scenarios.optimistic.points[index]!.total : scenarios.optimistic.points[index]!.realTotal),
    target: Number(point.target) * (nominal ? Math.pow(1 + inflation / 100, point.year) : 1),
  }))
}

export function scenarioPayload(input: SimulatorInputs) {
  return { ...input, name: input.name.trim(), initialCapital: decimal(input.initialCapital)!, monthlyContribution: decimal(input.monthlyContribution)!, targetCapital: decimal(input.targetCapital)!, annualReturnPct: Number(input.annualReturnPct), annualInflationPct: Number(input.annualInflationPct), years: Number(input.years), contributionGrowthPct: Number(input.contributionGrowthPct) }
}

export type { SimulationResult }
