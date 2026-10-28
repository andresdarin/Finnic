import { MessageCircle, Sparkles, User, type LucideIcon } from 'lucide-react'
import { NAV_ITEMS } from '../sidebar/hooks'
import { NEW_ACTIONS, type NewActionType } from '../new-action/constants'

export interface CommandContext {
  navigate: (href: string) => void
  runAction: (type: NewActionType) => void
  openFinnic: () => void
}

export interface PaletteCommand {
  id: string
  group: 'Ir a' | 'Acciones'
  label: string
  keywords: string[]
  icon: LucideIcon
  run: (ctx: CommandContext) => void
}

/** Pantallas que no están en la sidebar pero se alcanzan desde la paleta. */
const EXTRA_SCREENS = [
  { label: 'Perfil', href: '/profile', icon: User, keywords: ['cuenta', 'contraseña'] },
  { label: 'Tranquilidad financiera', href: '/tranquilidad-financiera', icon: Sparkles, keywords: ['metas', 'simulador', 'ahorro'] },
]

/** Registro de comandos de ⌘K. "Finnic AI" (/ai) solo para admins. */
export function buildCommands({ isAdmin }: { isAdmin: boolean }): PaletteCommand[] {
  const screens = [
    ...NAV_ITEMS.filter((item) => item.href !== '/ai' || isAdmin).map((item) => ({ ...item, keywords: [] as string[] })),
    ...EXTRA_SCREENS,
  ].map<PaletteCommand>(({ label, href, icon, keywords }) => ({
    id: `go:${href}`, group: 'Ir a', label, keywords, icon, run: (ctx) => ctx.navigate(href),
  }))

  const actions = NEW_ACTIONS.map<PaletteCommand>(({ type, label, keywords, icon }) => ({
    id: `new:${type}`, group: 'Acciones', label, keywords, icon, run: (ctx) => ctx.runAction(type),
  }))

  const askFinnic: PaletteCommand = {
    id: 'finnic:ask', group: 'Acciones', label: 'Preguntar a Finnic', keywords: ['chat', 'ayuda', 'copiloto'],
    icon: MessageCircle, run: (ctx) => ctx.openFinnic(),
  }

  return [...screens, ...actions, askFinnic]
}
