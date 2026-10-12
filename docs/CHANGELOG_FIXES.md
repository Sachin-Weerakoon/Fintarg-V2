# Changelog Fixes & Stability Audit

## Phase 0 — Baseline and Test Hygiene

### 0.1 Test Environment & Safe Dummies
- **What was wrong:** Running `npm test` on a clean clone without `.env` failed because `src/config/env.ts` throws when `MONGODB_URI`, `JWT_SECRET`, origins, encryption keys, and cron secret are unset. Integration tests could also inadvertently hit external MongoDB instances.
- **What changed:** Added `backend/src/test/setup.ts` providing safe dummy fallback environment variables when `NODE_ENV=test`. Configured `backend/package.json` to load it via `tsx --import ./src/test/setup.ts`. Updated `backend/src/integration/api.test.ts` to dynamically instantiate and manage in-memory MongoDB with graceful skips and pre-warmed model indexes.
- **How verified:** Verified with `DOTENV_CONFIG_PATH=.env.nonexistent npm test` and `npm test` at root without `.env`. All 51 backend tests pass.

### 0.2 `mongodb-memory-server` Packaging & Dynamic Import
- **What was wrong:** `mongodb-memory-server` was listed under production `dependencies` in `backend/package.json` and statically imported at module evaluation time in `src/config/database.ts`, unnecessarily bloating production container images.
- **What changed:** Moved `mongodb-memory-server` to `devDependencies` in `backend/package.json`. Replaced top-level static import with dynamic import loaded only in non-production environments when fallback is triggered.
- **How verified:** Ran backend `npm run typecheck` and `npm test`. No bundle or build warnings.

### 0.3 Database Connection Event Logging
- **What was wrong:** `connectDatabase()` logged `logger.info(..., 'MongoDB connected')` unconditionally on every single incoming HTTP request processed by the database middleware.
- **What changed:** Attached a single listener to `mongoose.connection.on('connected', ...)` to log connection success once, eliminating noisy request-level log spam.
- **How verified:** Inspected test logs and confirmed connection message logs once on connection establishment.

### 0.4 GitHub Actions CI Workflow
- **What was wrong:** Repository lacked an automated GitHub Actions CI pipeline to gate pull requests.
- **What changed:** Created `.github/workflows/ci.yml` running backend typecheck + tests and frontend typecheck + lint + vitest + build on pull requests and pushes to `main`. Excludes all secret credentials.
- **How verified:** Ran root `npm test` successfully (all 51 backend tests and 26 frontend tests pass).

## Phase 1 — Data-Corruption Bugs in the Records API

### 1.1 Partial Update Isolation & `toStored` Split
- **What was wrong:** `recordService.toStored` was executed uniformly during both create and update operations, applying default values (`accountName='Main Account'`, `cardName='Payment Card'`, `last4='0000'`, `principal=0`) when fields were omitted from partial update payloads. In loans, this zeroed the principal and calculated EMI. In goals, it recalculated target monthly amounts and could wipe progress.
- **What changed:** Split `toStored` into `toStoredForCreate` and `toStoredForUpdate`. In `toStoredForUpdate`, fetched the existing document (`getRecord`) and merged changed fields. Added strict `last4` regex `^\d{4}$`. Ensured PAN and CVV are never stored in the database or returned in API responses. In loans, recalculated EMI only from merged values and adjusted balance as `max(0, newPrincipal - totalRepaid)`. In goals, preserved `savedAmountCents` and `contributions`.
- **How verified:** Added targeted unit tests in `recordService.test.ts` verifying partial updates for bank accounts, cards, loans, and goals without mutating unpassed fields.

### 1.2 Frontend/Backend Loan Field Mapping & Readonly Stripping
- **What was wrong:** The frontend sent `principal` on `UPDATE_LOAN` while the backend schema expected `amount`. Furthermore, computed/readonly fields (`id`, `balance`, `repayments`, `monthlyPayment`, `totalInterest`) were posted in update payloads, risking overwrites.
- **What changed:** Unified loan mapping in `frontend/src/services/storeApi.ts` for both create and update (`amount = principal`), and stripped readonly and computed fields before submitting to the backend. Preserved repayments array and running balance in frontend `LoansTab.tsx`.
- **How verified:** Added `storeApi.test.ts` verifying that editing a loan's lender or principal preserves repayments, maps `principal` to `amount`, and omits readonly fields.

### 1.3 `interestBasis` Support & Loan Method Unification
- **What was wrong:** `calculateLoan` ignored `interestBasis` ('monthly' vs 'annual') on the server. In the UI and store, 'compound' was selectable but lacked distinct formula implementation from reducing balance.
- **What changed:** Added `interestBasis: 'annual' | 'monthly'` support to backend `calculateLoan` and `calculateAmortizationSchedule`, converting monthly rates (`rate * 12`) for reducing balance math. Aligned compound and reducing_balance treatments across backend and frontend `loanMath.ts`.
- **How verified:** Tested three reference test vectors (100k@12%/12m reducing EMI 8,884.88; 100k@12% flat -> 12,000; 500k@14%/60m EMI 11,634.13) and added test cases verifying monthly interest rate calculation equivalence.

### 1.4 Bank Account Balance Protection on Update
- **What was wrong:** `UPDATE_BANK_ACCOUNT` sent `balance` from the frontend, which could overwrite server-side adjusted balances.
- **What changed:** Stripped `balance` and `currentBalance` in `storeApi.ts` on `UPDATE_BANK_ACCOUNT`. Stripped `balance` and `currentBalance` in backend `toStoredForUpdate` for bank accounts to prevent metadata edits from overwriting ledger balances.
- **How verified:** Added unit test in `recordService.test.ts` verifying that passing `balance` in an update payload does not overwrite existing `balanceCents`.

### 1.5 BankAccount `notes` & Card `cardHolder` Field Reconciliation
- **What was wrong:** Zod schema accepted `notes` on bank accounts and `cardHolder` on cards, but Mongoose schemas lacked these fields, dropping them silently on persist.
- **What changed:** Added `notes` to `IBankAccount` and `BankAccountSchema`. Added `cardHolder` to `ICard` and `CardSchema`, and verified persistence in `recordService`.
- **How verified:** Added unit tests verifying `notes` and `cardHolder` persist across create and update operations.

### 1.6 Payment Method & Frequency Enum Alignment
- **What was wrong:** Frontend Payments and Transaction forms offered payment methods and frequencies (`standing_order`, `online`, `pending`, `weekly`, `quarterly`, `annually`) not accepted by backend models and zod schemas, causing silent save failures or filter misses.
- **What changed:** Aligned `paymentMethod` enum across `records.ts`, `Transaction.ts`, `Expense.ts`, and `Income.ts` to include `cash`, `card`, `bank_transfer`, `cheque`, `standing_order`, `online`, and `other`. Added `other` option to transaction history filter.
- **How verified:** Added test in `records.test.ts` verifying `standing_order` and `online` pass validation across expenses, incomes, and transactions.

### 1.7 Foreign Key Ownership & ObjectId Validation
- **What was wrong:** `cardId` was accepted on expenses, incomes, and transactions without verifying ownership by the authenticated user. Invalid ObjectId strings threw 500 internal server errors instead of clean 400 Bad Request responses.
- **What changed:** Added strict ObjectId validation returning 400 when invalid IDs are supplied. Enforced `cardId` ownership check against `userId` in `createRecord` and `updateRecord`, returning 404 when cards belong to other users. Added multi-tenant isolation tests.
- **How verified:** Integration and unit tests confirmed cross-tenant access is blocked and malformed IDs return 400.

### 1.8 Strict ISO Date (`YYYY-MM-DD`) and Month (`YYYY-MM`) Validation
- **What was wrong:** Dates were accepted as loose strings (`min(1).max(32)`), permitting arbitrary strings (e.g. `"not-a-date"`, `"2026-02-31"`) that silently broke frontend month filtering using `.startsWith(month)`. Personal budget endpoints accepted unvalidated month strings.
- **What changed:** Implemented `isValidIsoDate` (validating real calendar dates including leap years) and `isValidIsoMonth`. Configured `records.ts` schemas to require `isoDateSchema` on all mandatory date fields and `optionalIsoDateSchema` on optional date fields. Updated `/api/profile/personal-budget` to strictly validate `YYYY-MM`. Created `backend/src/scripts/checkNormalizeDates.ts` with `--dry-run` default to scan and report invalid stored dates across all collections.
- **How verified:** Added unit tests in `records.test.ts` and `checkNormalizeDates.test.ts`, and integration tests in `api.test.ts` verifying rejection of invalid dates and months.

## Phase 2 — Ledger Integrity & Financial Calculations

### 2.1 Double-Entry Foundations, `openingBalanceCents`, and Built-in Cash Wallet
- **What was wrong:** Bank accounts stored a standalone `balanceCents` field that drifted when transactions were added, updated, or removed. There was no concept of an opening balance, and cash transactions lacked an account backing.
- **What changed:** Added `openingBalanceCents` to `BankAccount` model. Created an automatic, non-deletable `cash` account per user (`accountType: 'cash'`) via `ensureCashWallet`. Implemented `ledgerService.ts` containing `postTransaction`, `reverseTransaction`, `recomputeBalance`, and `backfillOpeningBalances`.
- **How verified:** Added unit tests in `ledgerService.test.ts` verifying that `recomputeBalance` reports `driftCents === 0` against `openingBalanceCents + sum(signed transactions)`.

### 2.2 Route Expenses and Incomes Through `ledgerService` with Account Validation
- **What was wrong:** Creating, updating, or deleting expenses and incomes directly created unlinked transaction rows without validating whether the user owned the bank account or card. Deleting an expense left balance adjustments orphaned.
- **What changed:** Routed expense and income creation, update, and deletion in `recordService` through `postTransaction`, `replaceTransaction`, and `reverseTransaction`. Enforced account ownership and payment method pairing (bank-linked methods require an owned `bankAccountId`; credit card requires an owned `cardId`; cash defaults to user's cash wallet). Adjusts credit card outstanding balance accurately.
- **How verified:** Unit tests in `recordService.test.ts` confirmed balance adjustments on accounts and credit cards with zero drift after create and delete.

### 2.3 Loan Repayment Ledger Integration & Payoff Calculation
- **What was wrong:** Loan repayments recorded repayment history without debiting user bank accounts or cash wallets. Payoff settle amounts had no endpoint or recalculation logic.
- **What changed:** Integrated `recordLoanRepayment` with `ledgerService` to debit bank account or cash wallet and post a transaction. Computed principal and interest split using amortization schedule. Implemented `deleteLoanRepayment` with full transaction reversal. Added `calculateLoanPayoff` payoff endpoint (`GET /records/loans/:id/payoff`) and modal dialog in UI.
- **How verified:** Unit tests in `recordService.test.ts` verified that loan repayments debit accounts, split principal/interest, adjust loan balance, and undo cleanly with zero drift.

### 2.4 Pawned Items Payments, Part-Principal, Redemption, and Undo
- **What was wrong:** Pawned items lacked a payment history subdocument, could not record part-principal or full redemption payments, and interest payments were not reflected in the cash flow ledger.
- **What changed:** Added `ticketNumber`, `status` (`active`/`redeemed`/`forfeited`), `principalOutstandingCents`, `interestPaidCents`, and `payments` subdocument array to `PawnedItem`. Implemented `recordPawnPayment` supporting payment types (`interest`, `part_principal`, `redemption`) with method/account ledger debits. Implemented `deletePawnPayment` for clean undo. Added Payment Sheet in UI.
- **How verified:** Unit tests in `recordService.test.ts` verified interest, part-principal, redemption, and undo payment flows with zero balance drift.

### 2.5 Finance Payments, Next Due Date Derivation, and Mark as Paid
- **What was wrong:** Finance obligations lacked payment tracking, `nextDueDate` was not auto-derived from `dueDay`, and `monthsRemaining` could not reach 0 to mark obligations completed. Dashboard overdue queries relied on unvalidated fields.
- **What changed:** Implemented `deriveNextDueDate` based on `dueDay`. Implemented `recordFinancePayment` ("Mark as paid"), posting an expense transaction via `ledgerService`, advancing `nextDueDate`, and decrementing `monthsRemaining` down to 0 (`status: 'completed'`). Implemented `deleteFinancePaymentPayment` for undo. Updated Dashboard queries to use real `nextDueDate`.
- **How verified:** Unit tests in `recordService.test.ts` verified date advancement, ledger debits, and completion transitions.

### 2.6 Goal Contributions with Optional Ledger Debit and Undo
- **What was wrong:** Savings goal contributions only updated goal progress without providing the option to debit an actual bank account or cash wallet.
- **What changed:** Added optional `debitAccount` flag, `paymentMethod`, and `bankAccountId` to `addGoalContribution`. When enabled, validates account ownership, creates a ledger transaction, and debits the account. Implemented `deleteGoalContribution` undo reversing the ledger transaction and restoring account balance. Added checkbox and account selector in UI.
- **How verified:** Unit tests in `recordService.test.ts` verified both offline tracking and ledger-debited contributions with zero balance drift.

### 2.7 Transfers Between Own Accounts, Cash, and Card
- **What was wrong:** Moving money between accounts or paying credit cards required disconnected manual entries that corrupted cash flow analytics.
- **What changed:** Implemented `transferFunds` creating two linked transactions with shared `transferGroupId` and `transferDirection` (`outgoing`/`incoming`). Handled account-to-account, account-to-cash, cash-to-account, and account-to-card transfers. Added endpoints `POST /records/transfers` and `DELETE /records/transfers/:transferGroupId` with full reversal. Added Transfer Funds UI modal.
- **How verified:** Added unit tests in `ledgerService.test.ts` and `storeApi.test.ts` confirming two-legged transfers, balance updates, and zero drift.

### 2.8 Generic Transaction CRUD Ledger Routing & System Row Protection
- **What was wrong:** Direct CRUD on `/records/transactions` bypassed `ledgerService`, resulting in balance drift. System-generated transactions (from expenses, incomes, loans, pawns, finances, transfers) could be deleted or updated directly, corrupting parent records.
- **What changed:** Routed generic transaction create, update, and delete through `postTransaction`, `updateTransactionById`, and `reverseTransactionById`. Protected system-generated rows (any transaction with `referenceId` or `transferGroupId`) by rejecting direct update or delete with `403 Forbidden`.
- **How verified:** Unit tests in `recordService.test.ts` verified generic transaction CRUD with zero drift and confirmed 403 rejection on system-generated rows.

### 2.9 Aggregation Pipeline for Transaction History with True Running Balance
- **What was wrong:** `getTransactionHistory` loaded all user transactions into memory, calculated running balance starting from zero without considering `openingBalanceCents`, and sliced in memory.
- **What changed:** Implemented MongoDB aggregation pipeline using `$setWindowFields` partitioned by `bankAccountId` and `$lookup` to incorporate `openingBalanceCents`, computing true running balance per account. Added compound indexes `{ userId: 1, bankAccountId: 1, date: -1 }`, `{ userId: 1, date: -1 }`, and `{ userId: 1, referenceId: 1 }`. Supported stable sort (`date: -1, createdAt: -1, _id: -1`), pagination (`skip`, `limit`), and filters (`startDate`, `endDate`, `category`, `type`, `paymentMethod`, `bankAccountId`, `cardId`, `search`).
- **How verified:** Unit tests in `recordService.test.ts` verified running balance calculations against opening balance, pagination, filters, and stable sort order.

### 2.10 Frontend StoreApi Contract Alignment, Pagination, and Error State
- **What was wrong:** `TransactionsHistoryTab.tsx` silently swallowed fetch errors and fell back to stale local state. It lacked pagination controls and did not utilize server-side pagination and search.
- **What changed:** Aligned `fetchTransactionHistory` return contract with backend response (`transactions`, `data`, `totalCount`, `summary`). Removed silent fallback, added explicit error banner with "Retry" action, and implemented responsive pagination controls ("Page X of Y", Previous/Next).
- **How verified:** Vitest tests in `storeApi.test.ts` and UI component tests in `buildingBlocks.test.ts` verified the response mapping and pagination behavior.

### 2.11 Property-Based Ledger Verification Script (`verifyLedger.ts`)
- **What was wrong:** No automated stress-testing existed to verify that arbitrary combinations and sequences of financial operations never introduce balance drift.
- **What changed:** Created `backend/src/scripts/verifyLedger.ts` property-based testing script executing randomized sequences of financial actions (expenses, incomes, transfers, loan repayments, pawn payments, finance payments, goal contributions, generic transactions, and undos) and asserting `driftCents === 0` across all accounts after every single operation. Added `verifyLedger.test.ts` into backend test runner.
- **How verified:** Ran property verification test with 30+ randomized operations in `npm test`. All 119 backend tests passed with zero balance drift.


