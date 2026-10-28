export const DEFAULT_QUERY_PERIODS = ['MONTH', 'FORTNIGHT', 'WEEK', 'YEAR', 'ALL_TIME'] as const
export type DefaultQueryPeriod = (typeof DEFAULT_QUERY_PERIODS)[number]

export interface Profile {
  id: string
  authUserId: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  defaultQueryPeriod: DefaultQueryPeriod
  createdAt: string
  updatedAt: string
}
