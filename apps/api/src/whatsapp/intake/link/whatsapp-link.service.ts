import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { createHash, randomInt } from 'node:crypto'
import { PrismaService } from '../../../prisma/prisma.service'
import { LINK_CODE_TTL_MS, LINK_MAX_FAILURES_PER_HOUR } from '../constants'

export const normalizePhone = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}
const hashCode = (code: string) => createHash('sha256').update(`finnic-whatsapp-link:${code}`).digest('hex')

export type LinkOutcome = 'linked' | 'invalid' | 'rate_limited' | 'phone_taken'

/**
 * A phone is linked only when the authenticated user generated a one-time code in the app
 * and that code arrives from the phone itself (Meta-signed webhook). Knowing a number is never enough.
 */
@Injectable()
export class WhatsAppLinkService {
  constructor(private readonly prisma: PrismaService) {}

  async createCode(profileId: string) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0')
    const expiresAt = new Date(Date.now() + LINK_CODE_TTL_MS)
    await this.prisma.$transaction([
      // Only the newest code is valid.
      this.prisma.whatsAppLinkCode.deleteMany({ where: { profileId, usedAt: null } }),
      this.prisma.whatsAppLinkCode.create({ data: { profileId, codeHash: hashCode(code), expiresAt } }),
    ])
    return { code, expiresAt: expiresAt.toISOString(), command: `vincular ${code}` }
  }

  async status(profileId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { id: profileId },
      select: { whatsappPhone: true, whatsappLinkedAt: true, whatsappDefaultAccountId: true, whatsappDefaultCurrency: true },
    })
    const phone = profile?.whatsappPhone ?? null
    return {
      linked: Boolean(phone && profile?.whatsappLinkedAt), phoneSuffix: phone ? phone.slice(-4) : null, linkedAt: profile?.whatsappLinkedAt?.toISOString() ?? null,
      defaultAccountId: profile?.whatsappDefaultAccountId ?? null, defaultCurrency: profile?.whatsappDefaultCurrency ?? null,
      businessNumber: process.env.WHATSAPP_BUSINESS_DISPLAY_NUMBER || null,
    }
  }

  async unlink(profileId: string) {
    await this.prisma.$transaction([
      this.prisma.profile.update({ where: { id: profileId }, data: { whatsappPhone: null, whatsappLinkedAt: null } }),
      this.prisma.whatsAppLinkCode.deleteMany({ where: { profileId } }),
    ])
    return this.status(profileId)
  }

  async updateDefaults(profileId: string, input: { defaultAccountId?: string | null; defaultCurrency?: 'UYU' | 'USD' | null }) {
    if (input.defaultAccountId) {
      const account = await this.prisma.financeAccount.findFirst({ where: { id: input.defaultAccountId, profileId, isActive: true, purpose: 'OPERATING' } })
      if (!account) throw new BadRequestException('La cuenta predeterminada debe ser una cuenta operativa activa.')
      if (input.defaultCurrency && account.currency !== input.defaultCurrency) throw new BadRequestException('La cuenta y la moneda predeterminadas deben coincidir.')
    }
    let clearAccount = false
    if (input.defaultCurrency && input.defaultAccountId === undefined) {
      const current = await this.prisma.profile.findUnique({ where: { id: profileId }, select: { whatsappDefaultAccountId: true } })
      const account = current?.whatsappDefaultAccountId ? await this.prisma.financeAccount.findFirst({ where: { id: current.whatsappDefaultAccountId, profileId } }) : null
      clearAccount = Boolean(account && account.currency !== input.defaultCurrency)
    }
    await this.prisma.profile.update({
      where: { id: profileId },
      data: {
        ...(clearAccount && { whatsappDefaultAccountId: null }),
        ...(input.defaultAccountId !== undefined && { whatsappDefaultAccountId: input.defaultAccountId }),
        ...(input.defaultCurrency !== undefined && { whatsappDefaultCurrency: input.defaultCurrency }),
      },
    })
    return this.status(profileId)
  }

  /** Consumes a code sent from `from`. Failures are counted per phone to block guessing. */
  async consume(code: string, from: string, recentFailures: number): Promise<LinkOutcome> {
    if (recentFailures >= LINK_MAX_FAILURES_PER_HOUR) return 'rate_limited'
    const phone = normalizePhone(from)
    if (!phone) return 'invalid'
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.whatsAppLinkCode.findUnique({ where: { codeHash: hashCode(code) } })
        if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return 'invalid'
        const claimed = await tx.whatsAppLinkCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: new Date(), usedByPhone: phone } })
        if (claimed.count !== 1) return 'invalid'
        const owner = await tx.profile.findFirst({ where: { whatsappPhone: phone }, select: { id: true } })
        if (owner && owner.id !== row.profileId) throw new ConflictException('phone_taken')
        await tx.profile.update({ where: { id: row.profileId }, data: { whatsappPhone: phone, whatsappLinkedAt: new Date() } })
        return 'linked' as const
      })
    } catch (error) {
      if (error instanceof ConflictException) return 'phone_taken'
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return 'phone_taken'
      throw error
    }
  }
}
