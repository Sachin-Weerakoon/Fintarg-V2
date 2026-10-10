# Fintarg UI/UX Consistency Audit

**Audit Date**: October 2026  
**Auditor**: Principal Product Designer & Senior Front-End Engineer  
**Scope**: Fintarg V2 (Next.js 15 App Router, React 19, Tailwind v4, Express/Mongoose backend)  
**Baseline Reference**: Dashboard (`frontend/src/components/DashboardClient.tsx`, `PageContainer`, `PageHeader`, `StatCard`, `Card`)

---

## 1. Executive Summary

A comprehensive multi-viewport static and visual audit was conducted across all application routes at **360px, 390px, 768px, 1024px, and 1440px** in both light mode and dark mode, across all six system `THEME_COLORS` (`#0FA3B1`, `#14284B`, `#2E9E6B`, `#7C3AED`, `#E91E8C`, `#F2A900`).

The **Dashboard** represents the gold standard for the application:
* Clean layout rhythm anchored by `<PageContainer>` (`max-w-6xl mx-auto space-y-6 w-full`)
* Consistent `<PageHeader>` with semantic eyebrow, title (`h1`), description, and contextual action cluster
* Standard metric cards via `<StatCard>` with tabular numbers (`.num`), iconography, and status badges
* Standard surfaces via `<Card>` (`p-6` desktop, `p-4` / `16px` mobile, `rounded-xl`, `border-border`, subtle shadows)
* Zero hard-coded hexes or palette classes (using semantic tokens: `--color-primary`, `--color-surface`, `--color-border`, etc.)
* Zero static inline styles (only dynamic progress bar widths)

In contrast, secondary screens (`advanced`, `financial`, `settings`, `welcome`, `print`, `goals`, `documents`, `analysis`) suffered from fragmentation:
1. **Duplicate implementations & monoliths**: `advanced/page.tsx` duplicated `Letters` and `Medical` despite separate routes existing at `/advanced/letters` and `/advanced/medical`. `financial/page.tsx` spanned 2,976 lines in one file.
2. **Missing UI Primitives**: 200+ raw `<button>`, `<input>`, `<select>` tags and 190+ static inline styles existed outside `components/ui/`.
3. **Hard-coded Tailwind palette classes**: Over 80 instances of raw palette classes (`slate-700`, `emerald-300`, `amber-300`, `red-300`, etc.) broke user-selected theme colors and dark mode token mappings.
4. **UX Disconnections**: Active tabs were not reflected in URL query parameters, causing tab reset on browser refresh or Back navigation. Dashboard quick action tiles did not deep-link to target tabs.

---

## 2. Screen-by-Screen Audit vs. Dashboard Standard

| Screen | Route | Visual Hierarchy & Spacing | Primitives Used vs Raw Elements | Theming & Contrast | Empty / Error / Loading States | Findings & Deviations |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dashboard** *(Standard)* | `/` | Standard `<PageContainer width="default">`, 24px vertical section gap, Card padding 24px desktop / 16px mobile. | Uses `PageHeader`, `StatCard`, `Card`, `Badge`, `Button`, `EmptyState`. Zero raw controls. | 100% semantic tokens (`bg-surface`, `text-text`, `text-muted`, `border-border`). AA compliant. | Empty states on accounts & bills. Uses dynamic loading. | **Reference baseline.** Only 2 inline styles present, both verified as dynamic percentage bar widths. |
| **Welcome / Auth** | `/welcome`, `/forgot-password` | Split-screen hero; right panel uses `max-w-md md:max-w-lg` container with 24px padding. | 3 raw `<button>`, 1 raw inline style. Uses `Input`, `PasswordField`, `Button`. | Hardcoded `#0F1D32` and 19+ palette classes (`slate-700`, `slate-800`, `slate-600`, `slate-300`, `red-200`). | Error alert present; lacks skeleton state during submission. | Cards need standardized tokens. Radio tiles in onboarding should use standard `RadioGroup` / `Card` styles. Brand link needs unified format. |
| **Financial Overview & Tabs** | `/financial` | Uses `PageContainer` and `PageHeader`, but internal tabs use fragmented sub-layouts and spacing. | Accounts, Expenses, Income, Finance, Loans, Pawned all in 2,976 lines. 1 raw `<button>`, 1 raw `<input>`. Hand-crafted tables instead of `DataTable`. | 5 hardcoded hex values (`#0FA3B1`, `#14284B`), 4 palette classes (`text-emerald-600`, etc.). | Empty states present in some tabs; missing in loan amortizations. Transaction loading lacks skeleton. | Monolithic architecture; URL doesn't track active tab (`?tab=expenses`). Filter bar lacks URL persistence. Forms need `FormGrid` and `MoneyField`. |
| **Goals** | `/goals` | Uses `PageContainer` and `PageHeader`. 24px grid rhythm. | Hand-built forms; raw `<input>` in modal. Lacks `MoneyField` and `DateField`. | Uses semantic tokens mostly; some inline badge styles. | Has empty state for no goals; lacks skeleton during initial load. | Target date calculation lacks standard `DateField`. Delete action must strictly use `ConfirmProvider`. |
| **Analysis** | `/analysis` | Uses `PageContainer` and `PageHeader`. | Hand-built comparison bars and custom breakdown rows. | Fully compliant tokens; print button triggers `/print/analysis`. | Lacks `EmptyState` when zero transactions exist for month. | Needs `EmptyState` with CTA linking to `/financial?tab=expenses`. Missing dynamic skeleton for calculation cards. |
| **Documents** | `/documents` | Uses `PageContainer` and `PageHeader`. | Hand-crafted document table without `DataTable`. File upload button uses custom styling. | Semantic tokens used. | Hand-built empty message instead of standard `EmptyState`. | Needs `DataTable` with responsive card transformation on mobile. Empty state should use standard `EmptyState`. |
| **Advanced Hub** | `/advanced` | Mixed max-width containers (`max-w-4xl`, `max-w-5xl`, `max-w-6xl`). Inconsistent 16px/24px/32px margins. | 1,635 lines. Contains duplicate Letters and Medical code. ~130 inline styles, 62 raw `<button>`, 57 raw `<input>`, 13 raw `<select>`. | 3 hardcoded hex codes. Theme colors overridden by inline styles. | Inconsistent empty tables. No error retry states. | **Worst offender.** Must remove duplicate Letters/Medical, split into `_components/`, rebuild on UI primitives, and eliminate all inline styles. |
| **Advanced: Letters** | `/advanced/letters` | Uses `PageContainer` and `PageHeader`. | Clean implementation using `Card`, `Button`, `Field`, `Input`, `Select`, `Textarea`. | Semantic tokens used. | Missing `EmptyState` on saved letters history. | Duplicated in `advanced/page.tsx`. Needs deep link from hub and URL redirection. |
| **Advanced: Medical** | `/advanced/medical` | Uses `PageContainer` and `PageHeader`. | Rebuilt on UI primitives, but uses local `ConfirmDialog` instead of `ConfirmProvider`. | Semantic tokens used. | Has basic `EmptyState`. | Duplicated in `advanced/page.tsx`. Needs deep link from hub and URL redirection. |
| **Settings** | `/settings` | Nested container `max-w-5xl mx-auto`. Hand-crafted sidebar tabs. | ~59 inline styles, 15 raw `<button>`, 16 raw `<input>`, 2 raw `<select>`. Hand-built toggle rows instead of `Switch` / `SettingRow`. | 1 hardcoded hex (`#0FA3B1`). Custom theme picker has manual styling. | Form save buttons lack pending loading state. | Must rebuild on `Card`, `SettingRow`, `Switch`, `FormField`, `Avatar`, `Button`. Account deletion must use `ConfirmProvider`. |
| **Print Views** | `/print/analysis`, `/print/letter/[id]` | Print layout with A4 portrait constraints. | 66 palette classes in analysis print, 3 in letter print, 1 in print layout. | Hardcoded `slate-*`, `emerald-*`, `cyan-*` classes instead of print tokens. | N/A (print preview). | Replace palette classes with dedicated high-contrast neutral print tokens readable in B&W and color printers. |
| **App Layout & Chrome** | Shell | Top bar (mobile) + sidebar (desktop) + bottom nav (mobile). | 8 inline styles, 1 hex color. | Active sidebar state uses tokens; verified AA contrast. | Global error and loading states exist. | Eliminate remaining 8 inline styles and 1 hex color. Ensure bottom nav safe-area padding at 320px–390px. |

---

## 3. UX Connection & Architecture Audit

| Issue ID | Area / Screen | Severity | Description | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **UX-001** | `advanced/page.tsx` | **Blocker** | Duplicate dead code: `advanced/page.tsx` embeds complete Letters and Medical components while standalone routes exist at `/advanced/letters` and `/advanced/medical`. | Remove embedded Letters and Medical from `advanced/page.tsx`. Update hub tiles to link to `/advanced/letters` and `/advanced/medical`. Add query redirect if `tab=letters` or `tab=medical`. |
| **UX-002** | `financial/page.tsx` | **Blocker** | Monolithic file (2,976 lines) combining 7 distinct tabs with internal state. Tab selection is lost on page refresh or browser Back. | Modularize into `app/(app)/financial/_components/{AccountsTab,TransactionsHistoryTab,ExpensesTab,IncomeTab,FinanceTab,LoansTab,PawnedTab}.tsx`. Synchronize active tab with URL query (`/financial?tab=...`). |
| **UX-003** | `financial` & `dashboard` | **Major** | Dashboard quick actions ("Record Income & Expenses") link to `/financial` root rather than deep-linking to the specific action tab (`/financial?tab=expenses`). | Update dashboard links to include target tab parameter (`/financial?tab=expenses`, `/financial?tab=accounts`, etc.). |
| **UX-004** | `settings/page.tsx` | **Major** | Hand-built toggle rows with raw `<button>` and static `style={{}}` instead of accessible `Switch` and `SettingRow` primitives. Lacks `ConfirmProvider` integration for account reset. | Rebuild settings with `Card`, `SettingRow`, `Switch`, `FormField`, `Avatar`. Wire account delete flow through `useConfirm()`. |
| **UX-005** | Multiple screens | **Major** | Hard-coded Tailwind palette classes (`slate-700`, `emerald-300`, `red-200`, etc.) override user custom theming and break dark mode token hierarchy. | Replace all palette classes with semantic tokens (`bg-surface`, `text-text`, `border-border`, `text-primary-text`, `text-success-text`, etc.). |
| **UX-006** | `financial/TransactionsHistoryTab` | **Major** | Transaction filters (date, type, bank account) reset on page navigation or refresh. | Sync filter values with URL query parameters using `useSearchParams` and `useRouter`. |
| **UX-007** | Multiple forms | **Major** | Forms lack loading / pending states on submit buttons, permitting double-submission. | Add `loading={submitting}` and `disabled={submitting}` to all submit buttons in form dialogs and sheets. |
| **UX-008** | `analysis`, `documents` | **Minor** | Missing standard `EmptyState` when records are zero; displays blank areas or unstyled text. | Integrate standard `<EmptyState>` with icon, friendly explanation, and primary action button. |
| **UX-009** | Global Copy | **Minor** | Inconsistent labels across screens: "Save Changes" vs "Update Profile" vs "Submit"; "Due date" vs "Due on". | Standardize all action microcopy against `docs/UI_COPY.md`. |

---

## 4. Dashboard Design Language Extraction (Implicit Rules)

The static and visual inspection of `DashboardClient.tsx` establishes the following non-negotiable page patterns:

1. **Page Canvas & Header Anatomy**:
   * Root wrapper: `<PageContainer>` (`max-w-6xl mx-auto space-y-6 w-full`).
   * Header: `<PageHeader eyebrow="..." title="..." description="..." actions={...} />` with `h1` semantic tag, 24px bottom border divider (`border-b border-border/80 pb-6`).
   * Spacing: 24px (`space-y-6`) between major page sections.
2. **Metric & Stat Card Anatomy**:
   * `<StatCard>`: 20px padding (`p-5`), `rounded-xl`, `border border-border`, `bg-surface`.
   * Label: `text-xs font-semibold uppercase tracking-wider text-muted`.
   * Value: `text-2xl font-bold tracking-tight num` with tabular numbers.
   * Icon chip: `w-9 h-9 rounded-xl flex items-center justify-center` with tone-specific tint fill.
   * Tag/detail: `text-[11px] font-medium px-2 py-0.5 rounded-md` with status border and fill.
3. **Card & Surface Anatomy**:
   * `<Card>`: 24px padding on desktop (`p-6`), 16px padding on mobile (`p-4` / `sm:p-6`), `rounded-xl` / `rounded-2xl`, `border border-card-border`, `shadow-card`.
   * Header: `<CardHeader title="..." subtitle="..." action={...} />` with 16px bold title and muted caption.
4. **Interactive Action Tiles**:
   * Padding 12px (`p-3`), `rounded-xl`, `border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/50 transition-all`.
   * Icon box: `w-7 h-7 rounded-lg flex items-center justify-center`.
   * Label: `text-xs font-semibold text-text`.
   * Trailing chevron: `Icon name="arrow-right" size={14}` in `text-muted` transitioning to `text-primary-text`.
5. **Tabs & Navigation**:
   * `<SegmentedTabs>`: Rounded pill container `bg-surface-hover border border-border p-1 gap-1.5`, active tab elevated `bg-surface text-text shadow-sm border border-border/80`, inactive tabs `text-muted hover:text-text`.
6. **Form Controls**:
   * Standard 8px radius (`rounded-lg`), 40px min height (`min-h-[40px]`), 16px font size on mobile to prevent iOS zoom, 14px on desktop.
   * Form fields arranged in `<FormGrid>` (1 column mobile, 2 columns desktop >= 768px).

---

## 5. Verification Plan

1. **Component Kit Extension**: Build missing primitives in `components/ui/` (`FormField`, `FormGrid`, `MoneyField`, `DateField`, `Checkbox`, `RadioGroup`, `SettingRow`, `SectionHeader`, `ListRow`, responsive `DataTable`, `Toolbar`/`FilterBar`, `Tooltip`, `IconChip`, `Avatar`, `ErrorState`, `Divider`, `PageSection`) and unit tests.
2. **Refactor Phase**:
   * Step 4.1: Clean duplicate Letters/Medical, split `advanced/page.tsx` into `app/(app)/advanced/_components/`.
   * Step 4.2: Rebuild `settings/page.tsx` on UI primitives.
   * Step 4.3: Split `financial/page.tsx` into modular components and sync tabs with URL.
   * Step 4.4: Refactor `welcome/auth` to remove palette classes and raw buttons.
   * Step 4.5: Standardize Goals, Analysis, Documents, Letters, Medical.
   * Step 4.6: Modernize print views with high-contrast print tokens.
   * Step 4.7: Clean `AppLayout` inline styles and verify mobile nav at 320px–390px.
3. **Quality Gates**:
   * Frontend: `tsc --noEmit`, ESLint (zero new warnings), Vitest, `next build`.
   * Backend: tests and typecheck unchanged and passing.
   * Visual verification at 360, 390, 768, 1024, 1440.
