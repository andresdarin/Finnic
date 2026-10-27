# Tranquilidad Financiera — backend

The personal lane is exposed under `/finance/tranquility` and requires the existing
Bearer `AuthGuard`. Every query resolves the authenticated user through
`ProfilesService` and applies `profileId`; it does not infer household ownership.

## Data and migration

`20261014120000_tranquility_financial_lane` is additive. Apply it only to an isolated
target using the normal Prisma migration process (`prisma migrate deploy`). It adds
owned configuration, immutable monthly budget snapshots, categories, scenarios and
valuation audit rows, plus account purpose/opening balance and safe module markers on
canonical `PersonalExpense`. It has not been applied to a remote or production DB.

Setup is one atomic transaction: it creates three owned accounts and default categories,
then snapshots the current-month budget. Repeating setup returns 409. Config changes do
not rewrite snapshots; currency changes are rejected after setup. Contributions are
canonical `TRANSFER` movements and valuations never create income.

## Operational limits

Movement mutations are limited to module-owned manual rows and reverse/apply account
balances in one transaction. Legacy and scheduled rows are read-only. Cross-currency
conversion requires the contract FX snapshot. Historical months without a persisted
budget are returned without a fabricated budget; historical reconstruction and complete
goal metrics remain intentionally conservative. The write-integrity migration adds
profile-aware composite keys/FKs and validates budget months, category buckets,
non-negative targets, and configuration basis points. Same-currency transfers never
apply a quote; missing FX makes affected totals and pool metrics `null` with
`MISSING_FX`, rather than returning partial sums. Pool contributed capital includes
its opening balance, while valuations affect gains only and never create income.
