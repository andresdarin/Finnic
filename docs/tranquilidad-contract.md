# Tranquilidad Financiera — phase 1 contract

The canonical ledger is the source of movements. Money is a decimal string with exactly two digits, no leading zeroes, and an absolute ceiling of `90000000000000.00`. `-0.00` is invalid. Currencies are `UYU|USD`; dates are real `YYYY-MM-DD` dates and months are strict `YYYY-MM`.

## Endpoints and payloads

`POST /finance/tranquility/setup` accepts one onboarding command:

```json
{"config":{"currency":"UYU","netMonthlyIncome":"100000.00","essentialExpenses":"60000.00","monthlyContribution":"10000.00","emergencyMonthlyContribution":"5000.00","futureMonthlyExpense":"0.00","multiplier":150,"emergencyMonths":6,"needsBps":7000,"wantsBps":2000,"futureBps":1000,"annualReturnPct":6,"annualInflationPct":4,"withdrawalRatePct":3.5},"emergencyInitial":"0.00","investmentInitial":"0.00","initialAvailable":"0.00"}
```

`PUT /finance/tranquility/config` accepts only `TranquilityConfig`; it never accepts or resets opening balances. `POST /finance/tranquility/movements` accepts `{type,amount,currency,date,concept,categoryId,note,financeAccountId,destinationAccountId,fxSnapshot}`. Amounts are positive. Expenses require `categoryId`; transfers require source and destination account IDs and are not income or expenses. Legacy movements that cannot be safely mutated are returned with `editable:false` and remain read-only. `POST /finance/tranquility/valuations` accepts `{accountId,date,newBalance,note}` and changes position only.

`GET /finance/tranquility?month=YYYY-MM` returns a fully typed, strict `TranquilityDashboard`:

```text
{month,currency,config|null,budget|null,accounts,categories,movements,
 summary:{month,currency,status:COMPLETE|MISSING_FX,totals:null|{plannedIncome,actualIncome,
 needs:{target,executed,remaining},wants:{target,executed,remaining},future:{target,executed,remaining},
 uncategorizedExpenses,totalExpenses,poolContributions,poolWithdrawals,netPoolFunding,netSavings,
 unallocatedSavings,savingsRatePct:null|number}},
 comparison:null|{previousMonth,totalExpensesDelta,netSavingsDelta,emergencyBalanceDelta:null|money,investmentBalanceDelta:null|money},
 monthlyHistory:[{month,status,totals:null|totals,emergencyBalance:null|money,investmentBalance:null|money}],
 pools:{emergency|investment:{purpose,currency,status,accountIds,openingBalance,balance,monthContributions,
 monthWithdrawals,lifetimeContributions,lifetimeWithdrawals,netContributedCapital,gains}},
 goalMetrics:null|{emergency,accumulation,financialIndependence},warnings:[{code,message,movementIds?}]}
```

Pool `gains` is `balance - (openingBalance + lifetimeContributions - lifetimeWithdrawals)`. `netSavings` is actual income minus expenses; `netPoolFunding` is contributions minus withdrawals. Future execution uses net pool funding. KPI “saved” therefore displays actual pool funding, not the planned budget. If any required foreign conversion lacks a matching snapshot, totals and monetary pool/goal metrics are `null` with `MISSING_FX`; records are never silently omitted.

An FX snapshot is `{toCurrency,rate,convertedAmount,asOf}`. The rate means destination units per source unit, is positive, has at most eight decimals, and is at most `1000000`. The converted amount is paired with the movement and must be used for the requested target currency.

## Accounts and projections

Setup creates operating, emergency, and investment accounts from `initialAvailable`, `emergencyInitial`, and `investmentInitial`. Contributions are ordinary `TRANSFER` movements between accounts, not writable wealth events. Account summaries are `{id,name,currency,purpose,balance,openingBalance}`, where purpose is `OPERATING|EMERGENCY|INVESTMENT`.

Simulator contributions are deposited at month-end: each month grows first, then receives the contribution. Contribution growth starts after each completed year. It reports nominal and inflation-adjusted totals, uses today-money targets for `realTotal`, includes opening capital at year zero, returns `null` when unreachable, and throws on deterministic numeric overflow. Conservative/base/optimistic scenarios use explicit assumptions (default returns 3%, 6%, 9%); they are not historical data.

Goal formulas are independent: emergency target is `essentialExpenses * emergencyMonths`; accumulation target is `monthlyContribution * multiplier`; and FI capital is `futureMonthlyExpense * 12 / (withdrawalRatePct / 100)`. FI targets round upward to cents so they are never understated. FI monthly withdrawal is `capital * withdrawalRatePct / 1200`. Emergency `monthsToGoal` is the ceiling of shortfall divided by the planned emergency contribution, or `null` when a positive shortfall has no planned contribution. Projections are capped at 100 years and an overflow yields `yearsToGoal:null` rather than invalidating the dashboard.

Exports are available from `@lovehold/shared/tranquility` and `@lovehold/shared/tranquility-engine`.
