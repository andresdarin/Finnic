export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.finnic.space').replace(/\/$/, '')
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://finnic.space').replace(/\/$/, '')

export const SIGNUP_URL = `${APP_URL}/signup`
export const LOGIN_URL = `${APP_URL}/login`
