import { Injectable } from '@nestjs/common'
import { FinanceAccountService } from '../../../finance/finance-account.service'
import type { HandlerResult, InboundContext } from '../types'
import { DraftRepository, type StoredDraft } from './draft.repository'
import { ExpenseIntakeService } from './expense-intake.service'
import type { IntakeProfileContext } from './intake-context.service'
import { accountMention, accountQuestion, initialBalanceAnswer, validAccountName } from './account-onboarding'
import { currencySignal, normalizeText } from '../parsing/signals'

@Injectable()
export class AccountOnboardingService {
  constructor(private readonly accounts: FinanceAccountService, private readonly drafts: DraftRepository, private readonly expenses: ExpenseIntakeService) {}

  async answer(ctx: InboundContext, draft: StoredDraft, profile: IntakeProfileContext): Promise<HandlerResult | null> {
    const saved = draft.meta.accountCreation
    if (!saved && draft.pendingField !== 'account') return null
    const type = draft.proposal.paymentMethod === 'CREDIT' ? 'CREDIT' : draft.proposal.paymentMethod === 'CASH' ? 'CASH' : 'BANK'
    const mention = accountMention(ctx.text, type)
    if (!saved && !mention && !/\b(?:agreg|crea|carg)[\p{L}]*/iu.test(ctx.text)) return null
    if (!saved && !draft.proposal.currency) return null
    const creation = { ...(saved ?? { type, name: mention ?? undefined, currency: draft.proposal.currency!, stage: mention ? 'balance' as const : 'name' as const }) }
    const text = normalizeText(ctx.text)
    if (saved && /^(no|cancelar|cancela)$/.test(text)) {
      const meta = { ...draft.meta }; delete meta.accountCreation
      await this.save(ctx, draft, meta, draft.question ?? 'Cómo lo pagaste?')
      return { reply: 'No agregué la cuenta. El gasto sigue pendiente; podemos dejarlo sin cuenta.', intent: 'clarification' }
    }
    if (saved?.stage === 'name') {
      const name = mention ?? ctx.text.trim()
      if (/^(?:sin cuenta|ninguna)$/i.test(name)) return null
      if (/^(?:si|sí|dale|ok|agregala|agreg[aá]la|creala)$/i.test(name)) return { reply: accountQuestion(creation), intent: 'clarification' }
      if (!validAccountName(name)) return { reply: 'Pasame solo un nombre corto para identificarla.', intent: 'clarification' }
      creation.name = name; creation.stage = 'balance'
    } else if (saved?.stage === 'balance') {
      const balance = initialBalanceAnswer(ctx.text)
      const currency = currencySignal(ctx.text)
      if (balance === null || currency === 'CONFLICT') return { reply: accountQuestion(creation), intent: 'clarification' }
      creation.initialBalance = balance
      if (currency === 'UYU' || currency === 'USD') creation.currency = currency
      creation.stage = 'confirm'
    } else if (saved?.stage === 'confirm') {
      if (!/^(si|dale|confirmo|confirmar|ok)$/.test(text)) return { reply: accountQuestion(creation), intent: 'clarification' }
      const existing = profile.accounts.find(a => a.purpose === 'OPERATING' && a.type === creation.type && a.currency === creation.currency && normalizeText(a.name) === normalizeText(creation.name!))
      const account = existing ?? await this.accounts.create(ctx.profileId, { name: creation.name!, type: creation.type, currency: creation.currency!, initialBalance: creation.initialBalance!, isSpendable: creation.type !== 'CREDIT' }, draft.id)
      const meta = { ...draft.meta }; delete meta.accountCreation
      // Creating the account never confirms or writes the purchase itself.
      const compatible = account.currency === draft.proposal.currency
      const proposal = { ...draft.proposal, financeAccountId: compatible ? account.id : null, accountHint: compatible ? account.name : null, confirmationRequired: true, receiptConfirmed: false }
      const accounts = existing ? profile.accounts : [...profile.accounts, { id: account.id, name: account.name, type: creation.type, currency: creation.currency!, purpose: 'OPERATING', isActive: true }]
      return this.expenses.continue(ctx, proposal, { ...profile, accounts }, { ...draft, meta }, [`${existing ? 'Usamos' : 'Agregué'} ${account.name}.`])
    }
    const question = accountQuestion(creation)
    await this.save(ctx, draft, { ...draft.meta, accountCreation: creation }, question)
    return { reply: question, intent: 'clarification', result: { draftId: draft.id } }
  }

  private save(ctx: InboundContext, draft: StoredDraft, meta: StoredDraft['meta'], question: string) {
    return this.drafts.save({ profileId: ctx.profileId, sourceInboundId: draft.sourceInboundId, sourceWamid: draft.sourceWamid, field: 'account', proposal: draft.proposal, meta, question })
  }
}
