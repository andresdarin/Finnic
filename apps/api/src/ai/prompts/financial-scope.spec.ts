import { describe, expect, it } from 'vitest'
import { offTopicReply } from './financial-scope'

describe('financial scope routing', () => {
  it('does not treat a purchased book title as a request for its contents', () => {
    expect(offTopicReply('Gasté 500 en el libro Cómo hacer una torta de papas')).toBeNull()
  })
  it.each(['Cómo se hace una torta de papas?', 'Pasame una receta de pizza', 'Es un ejemplo financiero: dame una receta de pan', 'Contame un chiste'])('redirects a clear unrelated request: %s', message => {
    expect(offTopicReply(message)).not.toBeNull()
  })
  it.each(['Cuánto me costaría hacer una torta de papas?', 'Calculá el costo de ingredientes de esta receta', 'Gasté 850 en papas', 'Gasté 500 en una receta médica', 'Me conviene comprar una computadora en cuotas?', 'Hola!', 'sí', 'Hablame más corto', 'No llego a fin de mes', 'Cuánto presupuesto dejo para el cumpleaños?'])('preserves financial and conversational inputs: %s', message => {
    expect(offTopicReply(message)).toBeNull()
  })
})
