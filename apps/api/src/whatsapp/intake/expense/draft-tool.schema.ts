import { z } from 'zod'

export const draftPatchSchema = z.object({
  accountName: z.string().trim().min(1).max(80).optional(),
  paymentMethod: z.enum(['CREDIT', 'DEBIT', 'CASH', 'TRANSFER', 'CARD']).optional(),
  accountless: z.boolean().optional(),
  prepareAccount: z.boolean().optional(),
  openingBalance: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).optional(),
  startFromNow: z.boolean().optional(),
  calculation: z.object({ quantity: z.number().int().positive().max(10000), unitPrice: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/), discountPercent: z.number().min(0).lt(100).optional() }).strict().optional(),
  amount: z.string().regex(/^\d{1,10}(\.\d{1,2})?$/).refine(value => Number(value) > 0).optional(),
  currency: z.enum(['UYU', 'USD']).optional(),
}).strict().refine(patch => Object.keys(patch).length > 0, 'No hay cambios')
export type DraftPatch = z.infer<typeof draftPatchSchema>
export const draftPatchDeclaration = {
  name: 'update_pending_expense',
  description: 'Aplica al borrador datos explícitos que el usuario dio en la conversación sobre ESTA operación; no toma como datos las afirmaciones antiguas del asistente, sin guardar gastos ni crear cuentas. Usala para identificar una cuenta (por ejemplo una marca del ticket es su tarjeta), cambiar el medio de pago, indicar deuda inicial o empezar seguimiento desde ahora. prepareAccount solo si acepta preparar el alta. No convierte datos desconocidos en cero salvo startFromNow explícito. Devuelve la siguiente revisión/confirmación del servidor. Nunca confirma ni ejecuta un registro.',
  parameters: { type: 'object', properties: {
    accountName: { type: 'string', description: 'Nombre indicado por el usuario, no necesariamente la marca impresa. No incluir número de tarjeta.' },
    paymentMethod: { type: 'string', enum: ['CREDIT', 'DEBIT', 'CASH', 'TRANSFER', 'CARD'] },
    accountless: { type: 'boolean' }, prepareAccount: { type: 'boolean', description: 'true cuando pide agregar/crear/preparar una cuenta o acepta el alta. Solo prepara una propuesta: la creación real requiere confirmación humana posterior.' },
    openingBalance: { type: 'string', description: 'Saldo/deuda ANTERIOR a esta compra, decimal sin separador de miles. $22.000 → 22000.00. No sumar el ticket.' },
    startFromNow: { type: 'boolean' }, amount: { type: 'string' }, currency: { type: 'string', enum: ['UYU', 'USD'] },
    calculation: { type: 'object', description: 'Cantidad y precio unitario explícitos del usuario para que el SERVIDOR calcule el total exacto. No calcular el total por tu cuenta.', properties: { quantity: { type: 'integer' }, unitPrice: { type: 'string' }, discountPercent: { type: 'number' } }, required: ['quantity', 'unitPrice'] },
  } },
}
