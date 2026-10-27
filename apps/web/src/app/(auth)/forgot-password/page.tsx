import { AuthBrand } from '@/features/auth/AuthComponents'
import ForgotPasswordForm from '@/features/auth/password/ForgotPasswordForm'

export default function ForgotPasswordPage() {
  return <div className="space-y-7"><AuthBrand title="Recuperá tu cuenta" subtitle="Te enviamos un enlace para elegir una contraseña nueva." /><ForgotPasswordForm /></div>
}
