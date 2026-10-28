# Financial conversation regression bank

`personal-finance-cases.json` contains 73 generic questions and human review criteria from the October 2026 audit. It contains no private answers, account identifiers, balances or credentials. Cases cover product metrics, calendar comparisons, budgeting, savings, debt, investing, hypothetical calculations, receipt workflow, privacy, insurance, housing and independent work in Uruguay.

## Automated guarantees

Intake unit tests cover calendar rollover, month selection, explanation versus transaction intent, zero-income definitions, and pending receipt corrections. `financial-audit.e2e.spec.ts` checks actual HTTP/worker calls and the same plan engine used by the app, including an unconfigured profile, actual versus planned income, missing product detail, complete-month product comparison and profile isolation. `receipt-corrections.e2e.spec.ts` verifies app/WhatsApp draft editing, reconciliation, explicit confirmation, balances and duplicate delivery.

Use an isolated local database with an existing `tranquility_` name; never a production URL:

```powershell
$env:TRANQUILITY_TEST_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55322/tranquility_ai_20261027?schema=public'
pnpm --filter @lovehold/api exec vitest run src/ai src/whatsapp/intake --maxWorkers=1
```

The database guard refuses another host/database family. Only fixture profiles are removed. Gemini and Meta are mocked at their network boundaries, so these tests are deterministic and do not claim to evaluate a real model's general advice.

## Real-model review

After deployment, ask the bank's questions in an authenticated test profile, one at a time. Keep initial and final balances, movement counts and payment preferences. Do not confirm synthetic expenses in production. Use local PostgreSQL fixtures to test writes and receipt confirmation. Record literal answers separately in a private local report.

Review correctness, complete intent, real tool evidence, scope/currency/date, missing data, capability claims, financial assumptions and brevity. Separate a wrong answer, a partial answer and a technical error. Use the bank as a representative sample, not an exhaustive set or a guarantee of perfect future answers. Repeat under empty/configured profiles, zero income, several currencies/cards, year rollover and legacy uncategorized entries. Do not grade merely by exact wording or reuse personal data as a generic expected answer.

The runtime `financial-reasoning.ts` contract applies even when the active system prompt is stored in the admin panel. `financial-focus.ts` keeps decision-changing caveats close to the current question. Personal amounts and plan calculations come from shared read services. Short general advice remains model-generated and still needs live evaluation.

`financial-advice.live.spec.ts` is an opt-in check with synthetic local income, expenses, budgets, emergency savings, credit debt and a USD account. Set `FINNIC_LIVE_API_KEY` privately alongside the isolated database URL to run it. It calls real Gemini, checks successful shared-metric tool reads and no transaction writes, and saves literal answers in the private local report folder for human review. It does not send WhatsApp messages or certify advice quality just because an HTTP request succeeded. Normal CI skips these billable/nondeterministic calls.

## Public Prex reference

The existing financial snapshot tool accepts `exchangeProvider: "prex"`; explicit Prex quote questions also work through intake. Data comes from [Cambio Uruguay's API](https://api.cambio-uruguay.com/api-docs), not an official Prex API. The response preserves buy/sell, provider, source date, fetch time and attribution. The source date has day precision: fetch time must never be described as the provider's update time. Quotes cache for five minutes, older dates are disclosed, dates beyond seven days/future/malformed values fail closed, and an upstream failure never substitutes another bank or silently serves an expired cache.

This informational reference does not alter expense history, plan FX assumptions or balances. Missing or stale quotes must remain explicit. Prex's [official help](https://www.prexcard.com/ayuda/cambiomoneda) describes conversion within its account; confirm an executable price there. No bank login or MCP server is needed for this public read.
