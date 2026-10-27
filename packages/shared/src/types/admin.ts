/** Contrato de `GET /api/admin/*`. Solo agregados: nunca montos, notas ni mensajes. */

export interface AdminDailyCount {
  /** Día en formato YYYY-MM-DD (UTC). */
  date: string
  count: number
}

export interface AdminMetrics {
  users: { total: number; new7d: number; new30d: number; active7d: number | null; active30d: number | null }
  households: number
  expenses: { household: number; personal: number }
  whatsappLinked: number
  ai: { runs30d: number; failed30d: number }
  signupsByDay: AdminDailyCount[]
  generatedAt: string
}

export interface AdminUserRow {
  id: string
  email: string
  displayName: string | null
  createdAt: string
  /** `null` si la base no expone `auth.users`. */
  lastSignInAt: string | null
  hasHousehold: boolean
  whatsappLinked: boolean
  expenseCount: number
}

export interface AdminUserPage {
  items: AdminUserRow[]
  page: number
  pageSize: number
  total: number
}

export interface AdminUserDetail extends AdminUserRow {
  baseCurrency: string | null
  timeZone: string | null
  whatsappLinkedAt: string | null
  households: Array<{ id: string; name: string; role: string; memberCount: number; joinedAt: string }>
  counts: {
    householdExpenses: number
    personalExpenses: number
    financeAccounts: number
    savingsGoals: number
    aiConversations: number
    whatsappMessages: number
  }
  gamificationXp: number
}
