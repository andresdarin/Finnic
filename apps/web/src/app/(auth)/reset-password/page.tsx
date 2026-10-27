import { AuthBrand } from '@/features/auth/AuthComponents'
import PasswordForm from '@/features/auth/password/PasswordForm'

export default function ResetPasswordPage() {
  return <div className="space-y-7"><AuthBrand title="Elegí una contraseña nueva" subtitle="Guardala para volver a entrar a Finnic." /><PasswordForm recovery /></div>
}
