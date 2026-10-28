# Finnic conversation audit — 2026-10-28

## What produces a response

`WhatsAppMessageProcessor` authenticates the sender, handles retries and attachments, and decides between intake, queries and the conversational agent. Receipt images are read by Gemini into a validated schema; the server constructs a draft. A draft is not a ledger entry.

`AiConfigResolver` selects the active prompt/model/tool configuration for the environment from the database, with a 30-second configuration cache and a bootstrap configuration when no deployment exists. `AgentOrchestrator` combines that prompt with shared voice, per-profile style preferences, financial/product rules, channel instructions, the conversation window and current pending state. Replies therefore do not come from a single personality prompt.

The model can call enabled financial read tools. Request-scoped capabilities handle current drafts: inspect, update, check status, resume, cancel and—only when a proposal is ready—confirm. The server supplies profile identity and binds those capabilities to the current operation. The tool schema never accepts a different profile or a client-provided confirmation flag.

Account creation uses validated financial account creation and a durable idempotency key. Expense creation goes through the existing use case, account effects and receipt reconciliation. The generic `AiPendingAction` path remains separate for ordinary agent write proposals; it retains its existing lease/idempotency confirmation workflow. This review does not replace that entire subsystem.

## Causes of the observed failures

1. Semantic draft editing existed, but semantic confirmation did not. A courteous acceptance could reach the model and cause another update rather than execution of the prepared operation.
2. Returning an unchanged update as a fresh proposal created an actual loop. Preparing a proposal and confirming one were not distinct capabilities.
3. An output guard replaced unbacked model claims with an old question. This reintroduced obsolete account names and appeared to ignore the user's correction.
4. The model received 20 database rows, not 20 complete user turns. Tool records and internal rows consumed the window. Historical intake user/reply pairs could also share a transaction timestamp.
5. Starting a new intake marked an older unfinished draft as cancelled, without distinguishing replacement from user cancellation.
6. The model lacked a read capability that distinguished draft status from a verified ledger entry. Previous assistant assertions could be mistaken for proof that something had been saved.
7. Retrying an inbound account confirmation after the draft advanced could cross into the expense-confirmation step unless that transition remembered its originating inbound message.

## Changes

- Added semantic confirmation restricted to the immutable proposal present at turn start. Questions, negative/conditional messages and stale proposals are refused. Confirming an account leaves the expense pending.
- Kept the originating inbound ID across account confirmation so replay cannot also confirm the expense.
- Unchanged draft updates return structured no-progress information rather than repeating the same question; the agent can then choose confirmation, inspection or clarification.
- Replaced the stale-question guard with one bounded corrective tool-use attempt and a neutral failure response. It does not reinsert obsolete state.
- Expanded retrieval to 80 rows and bounded model context by 20 user turns while retaining tool pairs. Restored ordering of older reversed intake pairs; new intake pairs have explicitly ordered timestamps.
- Added profile-scoped intake status reads that verify current ledger existence. A completed draft whose expense was undone is not reported as a currently registered expense.
- Preserved displaced drafts as parked. Added an explicit resume capability that checks ownership and existing registration, keeps the original source/idempotency key and requires fresh review. Legacy cancelled rows are labelled as potentially cancelled or replaced; their cause is not attributed to the user.
- Gave persisted tool state priority over historical assistant text. Pending-operation interpretation uses a lower sampling temperature, keeping the existing bounded iteration/timeout policy.

## Verification and its limits

The replay fixture uses the real receipt/intake, agent-tool, confirmation and account-onboarding handlers with in-memory substitutes for external persistence and writes. It checks polite consent, a retry of the same inbound message, a separate expense confirmation, current ledger status, stale-proposal refusal, negative/conditional consent and ownership checks.

The opt-in `FINNIC_CONVERSATION_LIVE=1` case uses the real `AgentOrchestrator`, shared prompt composition and Gemini. It seeds the contradictory history from the screenshot, asks the model to recover the account identity and previously supplied debt, then sends “sí, por favor”. The result must advance from account proposal to receipt review without creating the expense. It sends no WhatsApp messages and changes no real financial data.

This does not establish universal natural-language understanding or complete long-term memory. Model history remains bounded. OCR quality, live Meta delivery, persistent user-specific account aliases and the separate generic agent-proposal path remain independent concerns. Existing financial data is not repaired or recorded by the tests.
