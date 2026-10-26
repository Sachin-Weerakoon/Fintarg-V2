# FUNCTIONAL REQUIREMENTS SPECIFICATION (FRS)
## Fintarg V2 — Complete Module-by-Module Behavioral Specification

- **Document ID**: FRS-002
- **Version**: 2.0 (Production Release)
- **Status**: Approved & Baselined
- **Companion Document**: SRS-002 (Software Requirements Specification)
- **Classification**: Confidential / Engineering Specification

---

## 1. Overview and Requirement Structure

This Functional Requirements Specification (FRS) details the functional behavior, input/output contracts, business rules, edge cases, and calculation formulas implemented across Fintarg V2.

### Requirement Priority Scale
- **[P1 - Critical]**: Essential system capability; platform cannot operate without it.
- **[P2 - High]**: Important business feature required for core workflow.
- **[P3 - Medium]**: Specialized feature or UX enhancement.

---

## 2. Module FR-1: Authentication, Security & Account Lifecycle

### FR-1.1 User Registration & Plan Initialization [P1]
- **Endpoints**: `POST /api/auth/register`, `POST /api/auth/login` (with `mode: 'signup'`).
- **Inputs**: `name` (string, 1–120 chars), `email` (valid email, normalized lowercase), `password` (min 8 chars), `workMode` (`'salary' | 'business' | 'both'`).
- **Behavior**:
  - Validates uniqueness of email.
  - Automatically maps plan: `salary` assigns `basic`; `business` or `both` assigns `business`.
  - Hashes password using `scrypt` with a cryptographically secure 16-byte random salt.
  - Automatically initializes user `Profile` and creates a non-deletable default `Cash Wallet` (`accountType: 'cash'`).
  - Sets `tokenVersion = 0`.
  - Issues `HttpOnly`, `SameSite=Strict` cookie containing signed JWT token.

### FR-1.2 Authentication & User Enumeration Defense [P1]
- **Endpoint**: `POST /api/auth/login`.
- **Inputs**: `email`, `password`.
- **Behavior**:
  - If user does not exist, executes constant-time dummy password verification using fixed dummy salt/hash, preventing side-channel timing attacks that leak account existence.
  - Returns generic `"Invalid email or password"` for all credential failures.
  - Checks `lockedUntil`: if active, rejects with `429 Account temporarily locked`. If expired, resets `failedLoginAttempts = 0`.
  - Increments `failedLoginAttempts` on failure; locks account for 15 minutes upon reaching 5 consecutive failures.

### FR-1.3 Session Revocation via `tokenVersion` [P1]
- **Endpoints**: `POST /api/auth/change-password`, `POST /api/auth/logout-all`, `POST /api/auth/logout`.
- **Behavior**:
  - `changePassword` validates current password, stores new `scrypt` hash, and atomically increments `tokenVersion`.
  - `logoutAll` increments `tokenVersion`, instantly invalidating all existing JWT sessions across devices.
  - Middleware `requireAuth` checks `payload.tokenVersion === user.tokenVersion` on every request.

### FR-1.4 Atomic Password Reset Workflow [P1]
- **Endpoints**: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.
- **Behavior**:
  - `forgot-password` generates a 32-byte cryptographic random token, stores SHA-256 hash with 1-hour expiry, and sends email. Always returns 200 OK with uniform simulated response delay to prevent timing leaks.
  - `reset-password` atomically consumes the token via `findOneAndUpdate({ tokenHash, used: false, expiresAt: { $gt: now } }, { $set: { used: true } })`. Invalidates all other reset tokens for the user and increments `tokenVersion`.

### FR-1.5 Cascade Account Deletion [P1]
- **Endpoint**: `DELETE /api/auth/account`.
- **Inputs**: `password`, `confirmation` (must exactly match string `"DELETE MY ACCOUNT"`).
- **Behavior**:
  - Re-authenticates password.
  - Permanently purges user documents across all 25+ MongoDB collections in a single atomic transaction.

### FR-1.6 Data Portability & Archive Export [P2]
- **Endpoint**: `GET /api/profile/export`.
- **Behavior**:
  - Assembles complete JSON archive of user profiles, bank accounts, cards, transactions, incomes, expenses, loans, goals, pawn items, finances, medical expenses, and business documents. Strictly strips `passwordHash`, `salt`, and internal tokens.

---

## 3. Module FR-2: Core Banking & Double-Entry Ledger

### FR-2.1 Account and Card Architecture [P1]
- **Record Kinds**: `bankAccounts`, `cards`.
- **Models**: [BankAccount.ts](file:///c:/Users/sachi/Desktop/Projects/Fintarg%20V2/backend/src/models/BankAccount.ts), [Card.ts](file:///c:/Users/sachi/Desktop/Projects/Fintarg%20V2/backend/src/models/Card.ts).
- **Rules**:
  - Built-in `Cash Wallet` (`accountType: 'cash'`) is generated automatically and cannot be deleted or renamed.
  - Bank account numbers, swift codes, branch codes, and preset banks (BOC, Commercial Bank, Sampath, HNB, Seylan, etc.) are validated and formatted.
  - Credit cards store `creditLimitCents` and `balanceCents` (outstanding balance). Card numbers are sanitized; CVV and full PAN are never stored in the database.

### FR-2.2 Two-Legged Internal Fund Transfers [P1]
- **Endpoint**: `POST /records/transfers`, `DELETE /records/transfers/:transferGroupId`.
- **Inputs**: `fromAccountId` or `fromCardId`, `toAccountId` or `toCardId`, `amount`, `date`, `description`.
- **Behavior**:
  - Generates a shared unique `transferGroupId` (`trf_<uuid>`).
  - Source Leg: posts `type: 'transfer'`, `transferDirection: 'outgoing'`, debiting account balance.
  - Destination Leg: posts `type: 'transfer'`, `transferDirection: 'incoming'`, crediting account balance (or reducing credit card debt).
  - Deleting/undoing a transfer reverses both transactions and restores balances atomically with zero drift.

### FR-2.3 Running Balance Pipeline with `$setWindowFields` [P1]
- **Endpoint**: `GET /records/transactions/history`.
- **Behavior**:
  - MongoDB aggregation pipeline calculates running balance per bank account:
    $$\text{Running Balance} = \text{openingBalanceCents} + \sum_{\text{tx}=1}^{N} \text{signedAmount}(\text{tx})$$
  - Supports stable sort (`date: -1, createdAt: -1, _id: -1`), pagination (`page`, `pageSize = 25`), search keyword, and filters by type, category, date range, and account.

---

## 4. Module FR-3: Cash Inflows, Expenses & Living Costs

### FR-3.1 Income Management [P1]
- **Record Kind**: `incomes`.
- **Fields**: `source`, `type` (`salary`, `business`, `freelance`, `investment`, `other`), `amount`, `frequency` (`monthly`, `one-time`), `date`, `bankAccountId`.
- **Behavior**:
  - Direct ledger integration: posts an `income` transaction through `postTransaction()`.
  - Automatically credits the destination bank account (or Cash Wallet if payment method is cash).

### FR-3.2 Expense Tracking & Account Validation [P1]
- **Record Kind**: `expenses`.
- **Fields**: `category`, `amount`, `date`, `paymentMethod`, `bankAccountId`, `cardId`, `note`, `recurring`, `sourceType` (`salary` vs `business`).
- **Validation**:
  - Bank-linked methods (`debit_card`, `bank_transfer`, `cheque`, `standing_order`) require an owned `bankAccountId`.
  - `credit_card` requires an owned `cardId`. Cash movements default to the Cash Wallet.
  - Debits the bank account or increments credit card balance with zero drift.

### FR-3.3 Medical Expense Coordination [P2]
- **Record Kind**: `medicalExpenses`.
- **Behavior**:
  - When a medical expense is recorded, automatically creates a linked `Expense` entry under the `"Medical"` category and debits the designated account.
  - Updating or deleting the medical expense updates or reverses the linked transaction cleanly.

---

## 5. Module FR-4: Debt Commitments, Loans & Pawned Items

### FR-4.1 Fixed Finance Obligations [P1]
- **Record Kind**: `financePayments`.
- **Fields**: `lender`, `amount`, `dueDay` (1–31), `monthsRemaining`, `paymentKind` (`instalment`, `lease`, `cheque`, `standing_order`), `bankAccountId`, `status` (`active`, `completed`).
- **Behavior**:
  - Automatically derives `nextDueDate` from `dueDay`.
  - "Mark as Paid" action debits the connected bank account via `ledgerService`, advances `nextDueDate` by 1 month, and decrements `monthsRemaining`. When `monthsRemaining === 0`, marks status `completed`.

### FR-4.2 Amortized & Reducing Balance Loans [P1]
- **Record Kind**: `loans`.
- **Methods**: `reducing_balance`, `compound`, `simple` (flat).
- **Basis**: `annual` vs `monthly` interest rate basis.
- **Formulas**:
  - Reducing Balance Monthly EMI:
    $$\text{EMI} = \frac{P \cdot r \cdot (1 + r)^n}{(1 + r)^n - 1} \quad \text{where } r = \frac{\text{Rate}}{12 \cdot 100}$$
  - Flat (Simple) Interest:
    $$\text{Interest} = P \cdot \left(\frac{\text{Rate}}{100}\right) \cdot \left(\frac{n}{12}\right)$$
- **Repayment Ledger Integration**:
  - `POST /records/loans/:id/repay`: computes interest accrued on current remaining principal (`balanceCents * monthlyRate`), allocates remainder to principal, debits bank account, and logs repayment subdocument.
  - `GET /records/loans/:id/payoff`: computes exact settlement amount (remaining principal + accrued unbilled interest).

### FR-4.3 Pawned Gold & Jewellery Tracking [P1]
- **Record Kind**: `pawnedItems`.
- **Fields**: `description`, `ticketNumber`, `amountReceived`, `principalOutstanding`, `interestRate`, `nextDue`, `status` (`active`, `redeemed`, `forfeited`).
- **Payment Operations**:
  - `interest`: records interest expense, advances `nextDue` date, debits bank account.
  - `part_principal`: reduces `principalOutstandingCents`, debits bank account.
  - `redemption`: settles remaining principal, sets `status: 'redeemed'`, and logs settlement.
  - Full undo capability reversing ledger transactions and restoring balances.

---

## 6. Module FR-5: Budgeting & Savings Goals

### FR-6.1 Personal Spending Allowance & Daily Budget [P1]
- **Endpoint**: `PUT /api/profile/personal-budget`.
- **Formulas**:
  - Days Remaining in Month:
    $$\text{daysLeft} = \begin{cases} 0 & \text{if past month} \\ \text{daysInMonth} & \text{if future month} \\ \text{daysInMonth} - \text{today} + 1 & \text{if current month} \end{cases}$$
  - Daily Budget Allowance:
    $$\text{Daily Allowance} = \frac{\max(0, \text{Monthly Budget} - \text{Actual Living Expenses})}{\text{daysLeft}}$$

### FR-6.2 Savings Goals & Account Capitalization [P1]
- **Record Kind**: `goals`.
- **Fields**: `name`, `targetAmount`, `targetDate`, `dailyAmount`, `monthlyTarget`, `savedAmountCents`.
- **Contributions**:
  - Offline tracking (increments goal saved progress).
  - Optional Ledger Debit (`debitAccount: true`): debits a chosen bank account or Cash Wallet via `ledgerService` and logs a savings transaction. Undo reverses the transaction and restores account balance.

---

## 7. Module FR-6: Financial Health, Analytics & Forecasting

### FR-7.1 Financial Health Score Ring (0–100) [P1]
Calculated from 6 weighted pillars in [lib/insights.ts](file:///c:/Users/sachi/Desktop/Projects/Fintarg%20V2/frontend/src/lib/insights.ts):
1. **Savings Rate (25 pts)**: $\ge 20\%$ yields full points.
2. **Spending Discipline (20 pts)**: Expenses within income.
3. **Debt Load (20 pts)**: Debt payments to income ratio $< 35\%$.
4. **Liquidity Runway (15 pts)**: Liquid reserves covering $\ge 6$ months of living expenses.
5. **Goal Pacing (10 pts)**: Active goals on track towards target dates.
6. **Budget Adherence (10 pts)**: Actual spending vs personal spending budget.

### FR-7.2 Visual Charts & Dashboards [P2]
- **Cash Flow Waterfall**: Starting liquid balance $\to$ Total Income $\to$ Operating Expenses $\to$ Debt Commitments $\to$ Savings Target $\to$ Projected Net Position.
- **Spending Heatmap**: Weekday-by-weekday transaction distribution.
- **Liquidity Runway**: $\text{Liquid Cash / Total Monthly Outflows}$ displayed in months and days.

---

## 8. Module FR-7: Enterprise & Branch Workspace (Business Plan)

### FR-8.1 Multi-Company Management [P1]
- **Record Kind**: `companies`.
- **Fields**: `name`, `brNumber`, `tinNumber`, `entityType` (`pvt_ltd`, `sole_proprietorship`, `partnership`), `sector`, `address`, `contact`, `revenueTargets`.
- **Cascade Rule**: Deleting a company cascade-deletes all associated branches, branch ledger entries, owner draws, and agreements.

### FR-8.2 Operating Branch Ledgers & Pruning Sync [P1]
- **Record Kind**: `businessBranches`, `branchEntries`.
- **Capabilities**:
  - Quick sales logging (daily revenue entries).
  - Operational cost categorization (`utility`, `electricity`, `water`, `rent`, `other-cost`).
  - Target tracking (monthly vs annual revenue progress).
  - Branch entry synchronization: updating a branch syncs existing entries and deletes removed entries from MongoDB.

### FR-8.3 Director / Owner Draws [P2]
- **Record Kind**: `ownerDraws`.
- **Behavior**: Records commercial equity withdrawals by business directors and links them to personal income ledger receipts.

### FR-8.4 Commercial Legal Agreements [P2]
- **Record Kind**: `agreements`.
- **Fields**: `title`, `otherParty`, `startDate`, `endDate`, `value`, `status` (`draft`, `active`, `expired`), `fileName`.

---

## 9. Module FR-8: Salary Workspace & Employment Profiles

### FR-9.1 Employment Profile & Payday Calculation [P1]
- **Record Kind**: `employmentProfiles`.
- **Fields**: `employer`, `role`, `monthlyGross`, `payday` (1–31), `monthlyDeductions` (EPF 8%, APIT), `monthlySavingsTarget`.
- **Rules**:
  - Net Take-Home Pay: $\max(0, \text{Gross} - \text{Deductions})$.
  - Payday Calendar Clamping: When posting to income ledger, clamps payday to actual days in target month:
    $$\text{Date} = \text{Month} + '-' + \min(\text{payday}, \text{daysInMonth})$$
    Eliminates 400 Bad Request errors on short months (e.g., February).

---

## 10. Module FR-9: Document Vault & Formal Letters

### FR-10.1 Document Storage with Magic-Byte Inspection [P1]
- **Record Kind**: `documents`.
- **Allowed Formats**: PDF, PNG, JPEG, WEBP, DOCX.
- **Rules**: Validates magic byte signatures on the server; rejects spoofed extensions with 415. Download responses serve `X-Content-Type-Options: nosniff` and `Content-Disposition: attachment`.

### FR-10.2 Formal Letter Generation & A4 Printing [P2]
- **Record Kind**: `letters`.
- **Features**:
  - Pre-formatted formal bank and official templates.
  - Auto-populates connected bank name and account number from user's verified ledger accounts.
  - Dedicated `@media print` styling formatting to A4 standard letterhead with reference numbers and verified document stamps.

---

## 11. Module FR-10: Automation, Background Jobs & Maintenance

### FR-11.1 Timing-Safe Cron Authorization [P1]
- **Endpoints**: `GET /api/cron/maintenance`, `GET /api/cron/reminders`.
- **Security**: Validates `x-cron-secret` using constant-time buffer comparison (`crypto.timingSafeEqual`) against `env.CRON_SECRET`.

### FR-11.2 Automated Maintenance Tasks [P1]
- Purges expired sessions (`SessionModel.deleteMany({ expiresAt: { $lt: now } })`).
- Purges expired password reset tokens (`PasswordResetModel.deleteMany({ expiresAt: { $lt: now } })`).

### FR-11.3 Reminder Dispatching & HTML Sanitization [P2]
- Batches pending reminder lookups (`dueDate <= today`, `channel: 'email'`).
- Sanitizes user input with `escapeHtml()` before interpolating into email templates.
- Atomically marks dispatched reminders as `status: 'sent'` and `sentAt: new Date()` to prevent double sends.
