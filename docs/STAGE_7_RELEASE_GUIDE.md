# Fintarg V2 — Finance Overhaul Release Guide (Stage 7)

## 1. Pull Request Overview
- **Source Branch:** `feat/finance-overhaul`
- **Target Branch:** `main`
- **Direct GitHub PR Link:** [Create Pull Request on GitHub](https://github.com/Sachin-Weerakoon/Fintarg-V2/compare/main...feat/finance-overhaul?expand=1)

---

## 2. Pull Request Description Template

### Title
`feat(finance): Unified design system, full data model, security hardening & responsive overhaul`

### Summary of Changes by Stage
1. **Stage 0 (`a0fd943`): Brand & Design System Foundations**
   - Scalable inline brand SVG vector logo (`/brand/fintarg-logo.svg`).
   - Standardized CSS variable design tokens for Light, Dark, and Deep Navy themes.
   - Comprehensive Design System guide published at `docs/DESIGN_SYSTEM.md`.

2. **Stage 1 (`0151511`): Security Hardening & Auth Fixes**
   - Fixed registration duplicate-key race condition with explicit 409 conflict mapping.
   - Removed destructive MongoDB TTL index on `lockedUntil`.
   - Hardened CORS origin allowlist and scoped auth rate-limiting with reverse-proxy IP trust (`trust proxy: 1`).

3. **Stage 2 (`9a15185`): Data Integrity Fixes**
   - Standardized UTC ISO string date handling across loans and pawn items.
   - Fixed savings goals progress retention during metadata updates.
   - Optimistic store rollbacks with contextual error toasts on mutation failures.
   - Added user schema profile picture persistence.

4. **Stage 3 (`cadc4a9`): Backend Data Model (Phase 1)**
   - New domain entities: `bankAccounts`, `cards`, `loans`, `goals`, `transactions`.
   - Unified unified transactions history ledger endpoint (`/api/transactions/history`).
   - Verified financial math vectors (EMI 8,884.88, total interest 6,618.55, EMI 11,634.13).
   - Strict multi-tenant isolation tests verifying User B cannot read or mutate User A's data.

5. **Stage 4 (`8abde45`): Frontend Building Blocks (Phase 2)**
   - Primitives: `PasswordField`, `Sheet` drawer, accessible `ToastProvider`, and modal `ConfirmProvider`.
   - Financial selectors: `PaymentMethodField` and `BankSelect` (with Sri Lankan bank presets).
   - Total replacement of legacy `window.confirm` and `window.alert` calls.

6. **Stage 5 (`143a444`): Screens & Features (Phase 3)**
   - Unified application shell with brand logo and Raxwo footer link.
   - Accounts & Cards tab with full CRUD.
   - Transaction History Ledger with type filters and running balance calculations.
   - Expenses & Incomes linked with bank accounts and payment methods.
   - Cheques & Standing Orders tracking.
   - Loans amortisation schedule calculator & partial/full repayments.
   - Goals tracker with target date, tally consistency check, and note logs.
   - Dashboard metric cards (Bank Liquidity, Daily Budget Left, Connected Accounts glance widget).

7. **Stage 6 (`fd54280`): Responsive & Polish (Phase 4)**
   - `SegmentedTabs` zero horizontal viewport clipping on 360px and 390px screens via smooth horizontal scrolling.
   - Cross-browser `.no-scrollbar` styling.
   - Ensured mobile inputs satisfy >= 16px minimum to prevent iOS zoom.
   - Verified `prefers-reduced-motion` compliance.

---

## 3. Backend Owner Review Checklist
- [x] **No Unscoped Queries:** Every record query filters strictly by `userId` or authenticated session ID.
- [x] **TTL Index Removal:** `lockedUntil` TTL index removed in schema; migration script created (`backend/scripts/dropLockedUntilIndex.ts`).
- [x] **Error Handling:** Centralized `HttpError` handlers ensure stack traces are hidden from production responses.
- [x] **CORS Configuration:** Replaced open wildcard reflection with strict origin validation against configured frontend URLs.
- [x] **Financial Math Consistency:** Backend compound and flat rate calculations match frontend Vitest vectors exactly.

---

## 4. Production Deployment Sequence

> **Important:** Always deploy the **Backend** before the **Frontend**. The frontend introduces direct calls to `/api/records/bankAccounts`, `/api/records/cards`, `/api/transactions/history`, and loan/goal sub-resources which must exist on the API server first.

### Step 1: Run MongoDB Migration Script (Production Atlas / DB)
If the previous database had the legacy TTL index on `users.lockedUntil`:
```bash
cd backend
npx ts-node scripts/dropLockedUntilIndex.ts
```
*(Safely drops index `lockedUntil_1` if present; no-op if absent).*

### Step 2: Deploy Backend to Vercel / Production Server
1. Trigger backend deployment or push to production branch.
2. Verify backend health check endpoint returns 200 OK:
   ```bash
   curl -I https://<your-backend-domain>/api/health
   ```

### Step 3: Deploy Frontend to Vercel
1. Merge the Pull Request into `main`.
2. Vercel will initiate the production build (`npm run build`).
3. Note the previous deployment URL in the Vercel Dashboard for instant one-click rollback if needed.

---

## 5. Post-Deployment Smoke Test Script
Execute these actions in order on the live production URL:
1. **Sign Up:** Register a new user account with strong password.
2. **Add Account:** Go to *Financial* > *Accounts & Cards* and add a Bank Account (e.g. Commercial Bank, Rs. 100,000 balance).
3. **Add Card:** Add a Debit/Credit card linked to that bank account.
4. **Record Expense:** Go to *Expenses*, create an expense for Rs. 2,500 using the Bank Account payment method.
5. **Verify Ledger:** Open *Transactions* ledger; verify the Rs. 2,500 debit appears with updated account balance.
6. **Add Loan:** Go to *Loans*, create a compound interest loan (e.g. Rs. 50,000 at 12% for 12 months). Verify the monthly EMI calculates to ~Rs. 4,442.44. Record a test payment.
7. **Add Savings Goal:** Go to *Goals*, create a goal with a target date and target amount (Rs. 100,000). Add a contribution of Rs. 10,000 and verify note logging and progress bar.
8. **Dashboard Verification:** Return to *Dashboard*; confirm Bank Liquidity and Connected Accounts glance widgets update immediately.
