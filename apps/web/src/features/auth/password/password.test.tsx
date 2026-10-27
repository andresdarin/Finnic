import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForgotPasswordForm from './ForgotPasswordForm'
import { usePasswordUpdate } from './usePasswordUpdate'

const auth = vi.hoisted(() => ({ getUser: vi.fn(), signInWithPassword: vi.fn(), updateUser: vi.fn(), resetPasswordForEmail: vi.fn() }))
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth }) }))
beforeEach(() => {
  vi.resetAllMocks()
  window.history.replaceState({}, '', '/')
  auth.getUser.mockResolvedValue({ data: { user: { email: 'owner@example.com' } }, error: null })
  auth.signInWithPassword.mockResolvedValue({ error: null })
  auth.updateUser.mockResolvedValue({ error: null })
  auth.resetPasswordForEmail.mockResolvedValue({ error: null })
})
afterEach(cleanup)

describe('password changes', () => {
  it('requires the current password before updating an authenticated account', async () => {
    const { result } = renderHook(() => usePasswordUpdate(false))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { await result.current.update('new-password', 'new-password', 'current-password') })
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'owner@example.com', password: 'current-password' })
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-password' })
    expect(auth.signInWithPassword.mock.invocationCallOrder[0]!).toBeLessThan(auth.updateUser.mock.invocationCallOrder[0]!)
    expect(result.current.success).toBe(true)
  })
  it('does not update after a wrong current password', async () => {
    auth.signInWithPassword.mockResolvedValue({ error: { code: 'invalid_credentials' } })
    const { result } = renderHook(() => usePasswordUpdate(false))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { await result.current.update('new-password', 'new-password', 'wrong') })
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(result.current.error).toBeTruthy()
  })
  it('rejects mismatched passwords before any mutation', async () => {
    const { result } = renderHook(() => usePasswordUpdate(true))
    await waitFor(() => expect(result.current.ready).toBe(true))
    await act(async () => { await result.current.update('new-password', 'different', '') })
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(result.current.error).toBe('Las contraseñas no coinciden.')
  })
  it('blocks an expired callback even when another session exists', async () => {
    window.history.replaceState({}, '', '/reset-password?error=invalid_link')
    const { result } = renderHook(() => usePasswordUpdate(true))
    await waitFor(() => expect(result.current.error).toContain('El enlace venció'))
    await act(async () => { await result.current.update('new-password', 'new-password', '') })
    expect(auth.getUser).not.toHaveBeenCalled()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
  it('requires a verified user for recovery', async () => {
    auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const { result } = renderHook(() => usePasswordUpdate(true))
    await waitFor(() => expect(result.current.error).toContain('Abrí el enlace'))
    expect(result.current.ready).toBe(false)
  })
})

describe('email recovery', () => {
  it('returns through the current app origin and does not expose account existence', async () => {
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Si ese correo tiene una cuenta'))
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('owner@example.com', { redirectTo: `${window.location.origin}/auth/password-callback` })
  })
  it('shows a recoverable error if email delivery fails', async () => {
    auth.resetPasswordForEmail.mockRejectedValue(new Error('network'))
    render(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'owner@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('No pudimos enviar'))
    expect(screen.getByRole('button', { name: 'Enviar enlace' }).hasAttribute('disabled')).toBe(false)
  })
})
