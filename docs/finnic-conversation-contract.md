# Conversation contract

The model owns natural interpretation and explanations. The server owns pending financial state, validated calculations, account compatibility, confirmation and writes. Personality is composed from shared voice, channel rules and closed per-profile preferences. This applies to the shared app/WhatsApp intake. See `finnic-conversation-audit-2026-10-28.md` for the full routing, context and confirmation review.

## Pending expenses

Quantity, unit price, discount and calculated total live on the persisted proposal rather than only in chat history. Natural-language follow-ups reach the conversational agent with request-scoped `get_pending_expense` and `update_pending_expense` tools. These tools always reload the profile's current draft and reject a replaced/expired draft. They accept validated changes, never profile IDs, confirmation flags or ledger writes. Quantity/unit-price calculations use integer cents on the server.

The agent interprets identity corrections, account setup and opening balances rather than relying on specific phrases. A successful update returns the persisted next question directly, avoiding a second model response that might describe different data. An unchanged update returns structured no-progress information instead of repeating a question. `confirm_pending_operation` is exposed only for a ready proposal, is bound to its turn-start snapshot, and rejects stale/negative/conditional requests. Account creation and expense registration retain separate human confirmations. Replayed account confirmations cannot also confirm an expense. Ordinary financial write tools remain unavailable while the draft is active.

`get_intake_status` checks actual ledger existence rather than treating conversation text as proof of registration. Replaced unfinished drafts are parked. `resume_pending_expense` checks ownership and existing registration and requires a fresh review; it cannot silently register an older expense.

## Calculations

The bounded purchase grammar recognizes explicit numeric quantities, unit prices marked “cada uno/una” or “c/u”, and percentage discounts. It uses integer cents, rounds the complete discounted total once, rejects invalid discounts and multiple unit-price lines, and never evaluates executable expressions. Computed totals require review before saving. A later unit-price or discount clarification can reuse the saved quantity. Unknown expressions require clarification; this is not a general mathematics engine.

## Personal preferences

List avoidance is an explicit, closed style dimension. It persists using existing profile-scoped style memory without schema changes or training. User instructions are not copied into the system prompt. Reset and adaptation controls retain their existing behavior.

## Regression and evaluation

Automated cases cover 3 × 427 = 1281, a later 450-per-book clarification with 5% discount = 1282.50, decimal rounding, invalid/multiple prices, persisted list avoidance, draft preservation and denial of model write calls during interruptions. Existing parsing, accounts, voice and orchestration checks remain part of the focused suite.

Human/live evaluation should check coherence, relevance, brevity and natural payment questions over multiple turns. Passing deterministic tests does not establish human indistinguishability or complete long-term memory. The existing model history window remains bounded; the persisted active-state snapshot protects the operation being discussed.

Further independent work: general mathematics beyond purchase calculations, durable conversation summaries with provenance, transaction-safe deduplication of generic agent proposals, persistent account aliases, and a consistent confirmation policy for all manual intake. These require their own acceptance scenarios rather than broader prompt promises.

The opt-in `FINNIC_DRAFT_LIVE=1` case in `draft-agent-tools.spec.ts` calls the real model once against isolated in-memory state to check semantic tool use. It is skipped by default and sends no WhatsApp messages or real financial writes. The live case covers an account identity correction and a debt expressed in words. It does not establish production OCR or WhatsApp delivery reliability.

`FINNIC_CONVERSATION_LIVE=1` in `receipt-payment-flow.spec.ts` uses the actual agent and shared prompt assembly over multiple turns, including contradictory historical assistant replies and polite confirmation. The external database and financial effects remain isolated test substitutes.

Architecture and evaluation references: the locally installed `improve-codebase-architecture` and `llm-evaluation` skills. No additional model calls, embedding store or runtime dependencies were introduced for this change.
## Presentación de tickets y fechas

La revisión muestra comercio y fecha en una cabecera breve, productos con viñetas sin numeración y una fila por producto. Omite cantidades iguales a uno y centavos cero en las filas; conserva los centavos significativos, las cantidades fraccionarias y los precios unitarios necesarios. El total mantiene dos decimales. El descuento se identifica como incluido, sin exponer su reparto interno. La pregunta final es «Lo guardo?».

Los nombres OCR en mayúsculas se suavizan solo para mostrarlos; los datos guardados no se modifican. Las fechas se escriben con meses en palabras: «hoy, 28 de octubre», «ayer, 27 de octubre», «26 de octubre»; se incluye el año cuando es distinto al actual. Hoy y ayer se calculan con America/Montevideo. Una fecha objetivo usa la fecha escrita sin prefijo relativo para evitar «para el hoy».
