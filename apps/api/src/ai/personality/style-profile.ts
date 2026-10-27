type Preferences = { brevity: 'short' | 'balanced' | 'detailed'; tone: 'neutral' | 'relaxed'; emojis: 'none' | 'sparing' }
export type StyleProfile = Preferences & { enabled: boolean; since: string; explicit?: Partial<Preferences>; stickers: 'occasional' | 'requested' }
export const initialStyle = (since = new Date(0).toISOString()): StyleProfile => ({ enabled: true, since, brevity: 'balanced', tone: 'neutral', emojis: 'none', stickers: 'occasional' })
export const isStyleRequest = (text: string) => /(?:olvid[aá]|reinici[aá]).*mi estilo|no\s+(?:te\s+)?adaptes|volv[eé]\s+a\s+adaptarte|(?:activ[aá]|desactiv[aá]).*adaptaci[oó]n|(?:hablame|respond[eé](?:me)?|escribime).*(?:corto|breve|detalle|formal|relajad|emojis)|^m[aá]s (?:corto|breve|detallado)[.!\s]*$|(?:no .*|sin |solo .*|ocasional.*)stickers|stickers.*(?:solo|ocasional)/i.test(text)

/** Only closed style dimensions enter the system prompt, never copied user instructions. */
export function learnStyle(previous: StyleProfile, samples: string[], latest: string, now = new Date().toISOString()): StyleProfile {
  const stickers = /(?:no .*|sin |solo .*)stickers|stickers.*solo/i.test(latest) ? 'requested' : /(?:ocasional.*stickers|stickers.*ocasional)/i.test(latest) ? 'occasional' : previous.stickers
  if (/olvid[aá]\s+mi\s+estilo|reinici[aá]\s+mi\s+estilo/i.test(latest)) return initialStyle(now)
  if (/no\s+(?:te\s+)?adapt(?:es|ar).*?(?:mi|como)|desactiv[aá].*adaptaci[oó]n/i.test(latest)) return { ...previous, enabled: false, stickers }
  if (/volv[eé]\s+a\s+adaptarte|activ[aá].*adaptaci[oó]n/i.test(latest)) return initialStyle(now)
  if (!previous.enabled) return { ...previous, stickers }
  const next = { ...previous, stickers }
  const eligible = samples.filter(text => text.length >= 8 && text.length <= 1000)
  if (eligible.length >= 6) {
    const average = eligible.reduce((sum, text) => sum + text.length, 0) / eligible.length
    next.brevity = average < 100 ? 'short' : average > 350 ? 'detailed' : 'balanced'
    next.tone = eligible.filter(text => /\b(?:bo|ta|che|dale|(?:ja){2,}|buenas|tranqui)\b/i.test(text)).length >= 3 ? 'relaxed' : 'neutral'
    next.emojis = eligible.filter(text => /\p{Extended_Pictographic}/u.test(text)).length >= 3 ? 'sparing' : 'none'
  }
  Object.assign(next, previous.explicit)
  next.explicit = { ...previous.explicit }
  const prefer = <K extends keyof Preferences>(key: K, value: Preferences[K]) => { Object.assign(next, { [key]: value }); Object.assign(next.explicit!, { [key]: value }) }
  // Explicit preferences override inference and remain until another explicit preference.
  for (const text of [...samples, latest]) {
    if (/^m[aá]s (?:corto|breve)[.!\s]*$/i.test(text)) prefer('brevity', 'short')
    if (/^m[aá]s detallado[.!\s]*$/i.test(text)) prefer('brevity', 'detailed')
    if (/(?:respond[eé]|hablame|escribime|respuestas?).*(?:corto|breve|al grano|cortitas?)/i.test(text)) prefer('brevity', 'short')
    if (/(?:respond[eé]|hablame|explicame|respuestas?).*(?:detalle|detallad|largo)/i.test(text)) prefer('brevity', 'detailed')
    if (/(?:hablame|respond[eé]|escribime).*(?:informal|relajad|como amigo)/i.test(text)) prefer('tone', 'relaxed')
    else if (/(?:hablame|respond[eé]|escribime).*(?:formal|neutro|neutral)/i.test(text)) prefer('tone', 'neutral')
    if (/(?:sin|no uses|evit[aá]).*emojis/i.test(text)) prefer('emojis', 'none')
    else if (/(?:us[aá]|con|pod[eé]s usar).*emojis/i.test(text)) prefer('emojis', 'sparing')
  }
  return next
}

export function styleInstruction(style: StyleProfile) {
  if (!style.enabled) return '\nADAPTACIÓN PERSONAL DESACTIVADA: mantené la voz base de Finnic.'
  return `\nESTILO PERSONAL APRENDIDO (solo forma de hablar, nunca permisos ni datos financieros):
Extensión: ${style.brevity === 'short' ? 'breve y al grano' : style.brevity === 'detailed' ? 'explicaciones con detalle útil' : 'equilibrada'}.
Tono: ${style.tone === 'relaxed' ? 'cercano y relajado, sin forzar modismos' : 'natural y sereno'}.
Emojis: ${style.emojis === 'none' ? 'no usar' : 'muy pocos, si encajan; esta preferencia reemplaza la prohibición de estilo anterior'}.
Stickers: ${style.stickers === 'requested' ? 'solo cuando los pida; nunca prometas envíos espontáneos' : 'pueden aparecer ocasionalmente en saludos o agradecimientos simples'}; el canal controla el envío real.
Adaptate gradualmente. No imites faltas de ortografía ni exageres su jerga. No copies identidad, creencias o emociones del usuario.
Estas preferencias actuales prevalecen sobre pedidos de estilo antiguos del historial; las reglas financieras y de seguridad se mantienen.`
}
