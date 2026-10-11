# Fintarg V2 - UI Copy & Terminology Guide

This document standardizes product vocabulary, microcopy conventions, action labels, dates, error handling, and empty state phrasing across Fintarg V2.

---

## 1. Core Principles

1. **Direct and Concise**: Use imperative action verbs (*Add*, *Save*, *Delete*, *Export*). Avoid verbose phrasing (*Click here to add*, *Please confirm*).
2. **Predictable & Familiar**: Consistent terms across all workspaces (Financial, Goals, Analysis, Documents, Advanced, Settings).
3. **Transparent Financial Context**: Always label currencies clearly (`Rs.` / `LKR`). Use standard banking terms recognized in Sri Lanka.
4. **Human & Reassuring**: Confirmation dialogs clearly state consequences. Error states explain what failed and provide an actionable retry.

---

## 2. Standard Action Verbs & Button Labels

| Action | Standard Button Label | Context / Rule | Do NOT Use |
| :--- | :--- | :--- | :--- |
| **Creation** | `Add [Entity]` (e.g. `Add Expense`, `Add Account`, `Add Goal`) | Primary call to action. Capitalize first letter of each word. | *Create*, *New Expense*, *Submit* |
| **Persistence** | `Save Changes` (settings/edits) or `Save` (modals) | When committing changes to an existing entity or settings page. | *Update*, *Apply*, *Done* |
| **Submission** | `Add [Entity]` or `Record [Entity]` | Dialog or form submission. While pending, show spinner + `Adding...` / `Saving...`. | *OK*, *Go*, *Proceed* |
| **Dismissal** | `Cancel` | Dismissing sheets, modals, or unsaved form states without saving. | *Close*, *Abort*, *Back* |
| **Destruction** | `Delete` | Red/destructive variant. Always triggers centered `useConfirm` dialog. | *Remove*, *Erase*, *Trash* |
| **Editing** | `Edit [Entity]` or icon button with tooltip | Opens edit modal or inline editable fields. | *Modify*, *Change* |
| **Recovery** | `Retry` | Displayed inside `ErrorState` components after network/data load failure. | *Try again*, *Reload* |
| **Authentication**| `Sign In`, `Sign Up`, `Sign Out` | Navigation and auth actions. | *Login*, *Register*, *Logout* |
| **Filters** | `Clear All`, `Search` | Filter bar operations. | *Reset*, *Filter out* |

---

## 3. Date & Financial Vocabulary

### Date Fields
- **Target Date**: Used exclusively for savings targets and milestones (e.g., in Goals: `Target Date`).
- **Due Date**: Used for liabilities, obligations, bills, pawn tickets, and loan instalments (e.g., in Loans/Pawn: `Due Date`, `Next Due Date`).
- **Date**: Used for historical records and transactions (e.g., in Expenses/Income: `Date`).
- **Expiry Date**: Used for cards (`MM/YY`).

### Currency & Money
- **Prefix**: Always prefix monetary amounts with `Rs.` (or tabular `LKR` in compact tables where specified).
- **Formatting**: Format thousands with commas (e.g. `Rs. 1,250,000.00` or `Rs. 50,000`).
- **Inputs**: Use `<MoneyField>` with `inputMode="decimal"` and automated formatting. Never ask the user to type currency symbols.

### Payment Methods
- **Card**: Debit or credit card transaction.
- **Bank Transfer**: Electronic direct fund transfer.
- **Cash**: Physical currency.
- **Cheque**: Physical cheque payment.
- **Standing Order**: Automated scheduled bank recurring transfer.

---

## 4. Confirmation Dialogs (Destructive Flows)

All entity deletions require the centered `ConfirmProvider` dialog (`useConfirm()`). Never use native `window.confirm()` or inline silent drops.

### Copy Template:
```
Title:   "Delete [Entity Name]"
Message: "Are you sure you want to delete '[Item Title / Account Name]'? This action cannot be undone."
Confirm: "Delete" (destructive variant)
Cancel:  "Cancel"
```

### Examples:
- **Bank Account**:
  - Title: `Delete Bank Account`
  - Message: `Are you sure you want to delete this bank account? All associated card records and history will be unlinked.`
- **Expense Record**:
  - Title: `Delete Expense`
  - Message: `Are you sure you want to delete this expense record? This will adjust your monthly analytics.`
- **Goal**:
  - Title: `Delete Goal`
  - Message: `Are you sure you want to delete this financial goal? Your savings progress history will be removed.`

---

## 5. Toast Feedback Messages

Every asynchronous mutation must trigger a toast via `useToast()` providing immediate user feedback.

### Creation:
- `[Entity] added successfully` (e.g., `Expense recorded successfully`, `Goal added successfully`)
- Failed: `Failed to add [entity]. Please check your connection and try again.`

### Modification:
- `Changes saved successfully`
- `[Entity] updated successfully`
- Failed: `Failed to save changes. Please try again.`

### Deletion:
- `[Entity] deleted successfully`
- Failed: `Failed to delete [entity]. Please try again.`

---

## 6. Empty States

Empty states must explain what is missing and present a direct CTA button so users never hit a dead end.

| Page / Section | Title | Description | Action CTA |
| :--- | :--- | :--- | :--- |
| **Transactions** | `No transactions found` | `No expense or income records match your current filters.` | `Clear filters` |
| **Accounts** | `No bank accounts connected` | `Add your primary savings or current accounts to start tracking balances.` | `Add Account` |
| **Cards** | `No cards linked` | `Link your debit or credit cards for swift expense categorization.` | `Add Card` |
| **Goals** | `No financial goals yet` | `Set a target date and target amount to track your savings progress.` | `Create Goal` |
| **Documents** | `No documents stored` | `Securely store salary slips, tax files, and financial statements.` | `Upload Document` |
| **Letters** | `No letters drafted` | `Draft bank requests, loan applications, and embassy letters with ease.` | `New Letter` |
| **Medical** | `No medical records logged` | `Keep a centralized log of medical policies, claims, and family health events.` | `Log Medical Event` |
| **Analysis** | `Insufficient data for analysis` | `Record at least 3 transactions this month to generate financial insights.` | `Record Expense` |

---

## 7. Form Field Labels & Helper Text

- Use title case for input labels (`Account Number`, `Monthly Income`, `Due Date`).
- Required fields are denoted semantically with `*`.
- Placeholder text must show examples, not instructions:
  - Good: `e.g. Commercial Bank - Colombo 03`
  - Bad: `Enter the name of your branch here`
  - Good: `071 234 5678`
  - Bad: `Type your phone number`
- Hints should guide constraints:
  - `Enter the 16-digit number embossed on your card.`
  - `Card CVV is the 3 or 4-digit security code on the back.`
