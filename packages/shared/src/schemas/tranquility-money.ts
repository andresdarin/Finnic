import { z } from 'zod'

const MAX_CENTS = 9_000_000_000_000_000n
export const moneyPattern = /^(0|[1-9]\d*)\.\d{2}$/
export const signedMoneyPattern = /^-?(0|[1-9]\d*)\.\d{2}$/
export const ratePattern = /^(0|[1-9]\d*)(\.\d{1,8})?$/

const boundedMoney = (signed = false) => z.string()
  .regex(signed ? signedMoneyPattern : moneyPattern, 'Money must have two decimals and no leading zeros')
  .refine(value => {
    const pattern = signed ? signedMoneyPattern : moneyPattern
    if (!pattern.test(value)) return false
    const cents = BigInt(value.replace('-', '').replace('.', ''))
    return cents <= MAX_CENTS && value !== '-0.00'
  }, 'Money is outside the supported bound')

export const TranquilityMoneySchema = boundedMoney(true)
export const NonNegativeTranquilityMoneySchema = boundedMoney()
export const PositiveTranquilityMoneySchema = NonNegativeTranquilityMoneySchema.refine(value => value !== '0.00', 'Amount must be positive')
export const TranquilityRateSchema = z.string().regex(ratePattern, 'Rate must have up to eight decimals').refine(value => Number(value) > 0 && Number(value) <= 1_000_000, 'Rate must be positive and bounded')
