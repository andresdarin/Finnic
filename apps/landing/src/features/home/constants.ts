import type { LucideIcon } from 'lucide-react'
import { Banknote, Heart, MessageCircle, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react'

export const NAV = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#funciones', label: 'Funciones' },
  { href: '#privacidad', label: 'Privacidad' },
  { href: '#preguntas', label: 'Preguntas' },
] as const

export interface Feature {
  icon: LucideIcon
  title: string
  body: string
}

/** Solo funciones que existen hoy en la app. */
export const FEATURES: Feature[] = [
  { icon: MessageCircle, title: 'Registro por WhatsApp', body: 'Escribí o mandá una nota de voz. Finnic arma el gasto y te lo confirma por escrito antes de guardarlo.' },
  { icon: ReceiptText, title: 'Tickets que se leen solos', body: 'Sacale una foto al ticket: productos, cantidades y precios quedan cargados, con el formato de acá.' },
  { icon: Banknote, title: 'Pesos y dólares', body: 'Cada cuenta en su moneda, sin conversiones inventadas. El tipo de cambio queda registrado cuando lo usás.' },
  { icon: Sparkles, title: 'Tranquilidad financiera', body: 'Cuánto podés gastar este mes, cuánto separar para emergencias y cuánto falta para tus metas.' },
  { icon: Heart, title: 'En pareja', body: 'Un hogar compartido para los gastos en común, con el balance claro de quién puso qué.' },
  { icon: ShieldCheck, title: 'Un asistente que sabe de tu plata', body: 'Preguntale a Finnic por tus gastos o tu presupuesto. Responde solo sobre finanzas personales.' },
]

export const STEPS = [
  { title: 'Creá tu cuenta', body: 'Cargá tus cuentas y su saldo de hoy. Pesos, dólares, efectivo o tarjeta.' },
  { title: 'Registrá como te quede cómodo', body: 'Desde la app, con una foto del ticket o por WhatsApp, en texto o en audio.' },
  { title: 'Mirá el mes con calma', body: 'Finnic ordena todo y te muestra dónde va tu plata y cuánto te queda disponible.' },
] as const

export const FAQ = [
  { q: '¿Qué es Finnic?', a: 'Un asistente para ordenar tus finanzas personales y compartidas: registrás ingresos y gastos, y Finnic te muestra en qué se va tu plata y cuánto podés gastar sin desordenarte.' },
  { q: '¿Cómo funciona con WhatsApp?', a: 'Vinculás tu número desde la app con un código. Después le escribís o mandás un audio como "gasté 1.150 en sushi" y Finnic te confirma el gasto por escrito antes de registrarlo. Si falta algo, como la moneda o la cuenta, te lo pregunta.' },
  { q: '¿Necesito instalar algo?', a: 'No. Finnic funciona en el navegador del celular o de la computadora, y podés agregarlo a la pantalla de inicio como una app.' },
  { q: '¿Puedo usarlo en pareja?', a: 'Sí. Creás un hogar, invitás a tu pareja y los gastos compartidos quedan separados de los personales, con el balance de cada uno.' },
  { q: '¿Qué pasa con mis datos?', a: 'Finnic no vende tus datos ni muestra publicidad. Los usa solo para darte el servicio, y podés pedir que se borren cuando quieras. El detalle está en la política de privacidad.' },
  { q: '¿Está terminado?', a: 'Finnic está en etapa de prueba: funciona y se usa todos los días, pero seguimos sumando y ajustando cosas a partir de lo que nos cuentan quienes lo usan.' },
] as const

export const WHATSAPP_DEMO = [
  { from: 'user', text: 'Gasté 1150 en sushi de PedidosYa' },
  { from: 'finnic', text: '¿El gasto de 1150 fue en pesos o en dólares?' },
  { from: 'user', text: 'pesos' },
  { from: 'finnic', text: 'Listo, anoté $ 1.150,00 en Pedido sushi (PedidosYa).' },
] as const
