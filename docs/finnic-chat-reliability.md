# Finnic: chat reliability and payment preferences

## Behavior

- Chat switches to the next configured model after overload, server/network failures or truncated output. One attempt per model, with a shared deadline and time reserved for fallbacks. Invalid credentials are not retried. Provider bodies and private prompts are not logged.
- Gemini 2.5 Flash chat reasoning is bounded to leave room for the actual answer. Receipt extraction retains its separate reasoning and timeout settings. A tool conversation has a 45-second model-call deadline; a failed response never confirms an expense.
- Ordinary conversation bypasses the extra intent-extraction request. Financial text extraction has a six-second upstream deadline before deterministic validation takes over. Missing fields still require clarification; this does not guess an amount or silently confirm a proposal.
- Monthly activity includes the largest expense per currency over the **whole month**, independent of the 30 recent-movement detail limit. Income, transfers and other profiles are excluded. Current-month maximum questions can be answered without Gemini in app and WhatsApp. A purchase is not presented as an individual receipt product.
- Payment defaults require an explicit command: `Usá pesos por defecto`, `Usá dólares por defecto`, `Mi cuenta habitual es Banco habitual`. Only a unique active operating account is accepted. Its currency is stored with it. Changing currency clears an incompatible default account. Existing payment-method compatibility and receipt confirmation remain in force.
- `Olvidá mi cuenta habitual` clears the account. `Olvidá mis preferencias de pago` clears account and currency. These defaults are shared by authenticated app intake and the linked WhatsApp profile. Ordinary expenses and receipt text never teach payment defaults.

## Local Docker verification

Use the Finnic container, not another project's Supabase instance. Create an isolated database whose name starts with `tranquility_` and apply the existing Prisma migrations. Do not reset the existing local database or load production credentials.

```powershell
$env:DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55322/tranquility_ai_20261027?schema=public'
$env:DIRECT_URL=$env:DATABASE_URL
pnpm --filter @lovehold/api exec prisma migrate deploy
$env:TRANQUILITY_TEST_DATABASE_URL=$env:DATABASE_URL
pnpm --filter @lovehold/api exec vitest run src/ai src/whatsapp/intake/__tests__ src/whatsapp/intake/parsing/payment-preferences.spec.ts src/whatsapp/intake/queries/largest-expense.spec.ts --maxWorkers=1
```

The HTTP/worker suites use actual PostgreSQL and mock Gemini/Meta at their edges. Both chat and extraction are mocked, preventing accidental external requests. Tests check the configured loopback endpoint and the exact isolated database name; Docker's internal server IP is allowed. Suites run serially because each worker polls the same inbox.

The new scenarios include a maximum older than 30 recent entries, independent currencies, income exclusion, profile isolation, explicit cross-channel preferences and clearing incompatible accounts. Existing suites cover ticket confirmation/cancellation, receipt products and discounts, corrections, duplicate delivery and credit debt/account effects. Real WhatsApp probes should use read-only questions or an incomplete draft followed by cancellation, keeping synthetic expenses in Docker.
