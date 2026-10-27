import { expect, it } from 'vitest'
import { paymentPreference } from './payment-preferences'
import type { IntakeProfileContext } from '../expense/intake-context.service'

const profile: IntakeProfileContext = { profileId: 'owner', timeZone: 'America/Montevideo', defaultAccountId: null, defaultCurrency: null, planCurrency: null, budgetCategories: [], accounts: [
  { id: 'bank', name: 'Banco', currency: 'UYU', type: 'BANK', purpose: 'OPERATING', isActive: true },
  { id: 'card', name: 'Visa', currency: 'UYU', type: 'CREDIT', purpose: 'OPERATING', isActive: true },
  { id: 'inactive', name: 'Vieja', currency: 'USD', type: 'BANK', purpose: 'OPERATING', isActive: false },
] }
it('remembers only explicit preferences, not a purchase or a conversational mention', () => {
  expect(paymentPreference('Gasté 850 pesos en Banco', profile)).toBeNull()
  expect(paymentPreference('Generalmente pago con Visa', profile)).toBeNull()
  expect(paymentPreference('Usá pesos por defecto', profile)?.input).toEqual({ defaultCurrency: 'UYU' })
  expect(paymentPreference('Mi cuenta habitual es Visa', profile)?.input).toEqual({ defaultAccountId: 'card', defaultCurrency: 'UYU' })
})
it('never assigns an inactive or ambiguous account and supports forgetting defaults', () => {
  expect(paymentPreference('Mi cuenta habitual es Vieja', profile)?.input).toBeUndefined()
  const ambiguous = { ...profile, accounts: [...profile.accounts, { ...profile.accounts[0]!, id: 'bank2', name: 'Banco ahorro' }] }
  expect(paymentPreference('Mi cuenta habitual es Ban', ambiguous)?.input).toBeUndefined()
  expect(paymentPreference('Olvidá mis preferencias de pago', profile)?.input).toEqual({ defaultAccountId: null, defaultCurrency: null })
  expect(paymentPreference('Usá pesos y dólares por defecto', profile)?.input).toBeUndefined()
})
