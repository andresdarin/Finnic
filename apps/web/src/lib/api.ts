const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  accessToken?: string,
): Promise<T> {
  const headers: Record<string, string> = {}
  const isFormData = options.body instanceof FormData

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  Object.assign(headers, options.headers as Record<string, string>)

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    let errorMessage = `Error ${res.status}: ${res.statusText || 'Petición incorrecta'}`
    if (typeof body?.message === 'string') {
      errorMessage = body.message
    } else if (body?.message && typeof body.message === 'object') {
      const fieldErrors = (body.message as Record<string, unknown>).fieldErrors
      if (fieldErrors && typeof fieldErrors === 'object') {
        const details = Object.entries(fieldErrors)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join('; ')
        if (details) errorMessage = details
      } else {
        errorMessage = JSON.stringify(body.message)
      }
    }
    throw new ApiError(res.status, errorMessage)
  }

  return res.json() as Promise<T>
}
