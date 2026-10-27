import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const destination = new URL('/reset-password', request.url)
  const response = NextResponse.redirect(destination)
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if ((!code && !tokenHash) || !url || !key) {
    destination.searchParams.set('error', 'invalid_link')
  } else {
    try {
      const client = createServerClient(url, key, { cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: cookies => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      } })
      const result = tokenHash
        ? await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        : await client.auth.exchangeCodeForSession(code!)
      if (result.error || !result.data.user) destination.searchParams.set('error', 'invalid_link')
    } catch { destination.searchParams.set('error', 'invalid_link') }
  }
  response.headers.set('Location', destination.toString())
  return response
}
