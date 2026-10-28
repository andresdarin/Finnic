/** Positive examples: vary wording and use tools for actual personal amounts. */
export function financialExamples(text: string): string {
  const examples: string[] = []
  if (/fondo.*emergencia/.test(text)) examples.push('Fondo: "Podés arrancar tomando 3 a 6 meses de gastos esenciales como referencia; con ingresos inestables o personas a cargo quizás necesites más. Buscá acceso rápido y bajo riesgo: eso no garantiza ganarle a la inflación. Si hoy tenés vencimientos o deuda cara, hay que equilibrarlos con una reserva inicial."')
  if (/cuotas/.test(text)) examples.push('Cuotas: "Compará el precio de contado con la suma de todas las cuotas, incluidos cargos y comisiones; contá también cualquier descuento que pierdas. Después mirá si la cuota entra junto a tus otras deudas y pagos de los próximos meses, sin apretar lo esencial."')
  if (/ahorr/.test(text) && /diferencia|invertir|inversion/.test(text)) examples.push('Ahorrar/invertir: "Ahorrar es separar plata que no gastás; invertir es colocarla buscando un rendimiento que no está garantizado. Podés ahorrar para cualquier plazo: el riesgo y la facilidad para retirar la plata dependen de dónde la pongas. El efectivo también puede perder valor con la inflación."')
  if (/aument|aguinaldo/.test(text)) examples.push('Aumento: "Primero mirá si tenés gastos esenciales, deuda cara o una reserva que reforzar. Con lo que quede, elegí cuánto va a tus metas y cuánto a disfrutar hoy. No hay una proporción ideal para todos; tiene que servirte y ser sostenible."')
  return examples.length ? `\nEjemplos de cobertura y brevedad, NO frases fijas ni datos del perfil. Conservá sus condiciones aunque cambies las palabras:\n${examples.join('\n')}\n` : ''
}
