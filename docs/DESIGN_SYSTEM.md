# Fintarg Design System (v2.0)

Unified Design System and Component Specification based on `UIX-001`, `SRS-001`, and `FRS-001`.

---

## 1. Core Principles

1. **Answer the Main Question First**: Dashboard leads with monthly net position and immediate guidance.
2. **Plain Language**: Human-first labels ("Remaining money", "Shortfall") rather than accounting jargon.
3. **Mobile First**: Built for 360px viewport baseline, responsive up to 1440px desktop.
4. **Color Never Carries Meaning Alone**: Status indicators (success, warning, danger) always combine color with an icon, sign, or explanatory text.
5. **Personal But Consistent**: Users can personalize primary theme colors, but layout, spacing, and typography remain constant.
6. **Strict WCAG 2.1 AA Accessibility**: Body text >= 4.5:1, UI components and large text >= 3:1.

---

## 2. Color System & Contrast Ratios

### Light Theme (`--color-scheme: light`)
| Token | CSS Variable | Hex / Value | Measured Contrast Ratio | Usage |
|---|---|---|---|---|
| Background | `--color-bg` | `#F6F8FB` | — | Canvas / Page background |
| Surface | `--color-surface` | `#FFFFFF` | 13.5:1 (vs text) | Cards, modals, containers |
| Surface Hover | `--color-surface-hover` | `#F1F5F9` | — | Table rows, interactive list items |
| Border | `--color-border` | `#E2E8F0` | — | Subtle dividers, card borders |
| Border Input | `--color-border-input` | `#8091A7` | 3.2:1 (vs white) | Form field borders (WCAG Non-Text) |
| Text Primary | `--color-text` | `#0F172A` | 14.8:1 (vs white) | Primary body and headings |
| Text Secondary | `--color-text-2` | `#334155` | 9.6:1 (vs white) | Secondary labels, descriptions |
| Muted Text | `--color-muted` | `#5B6B80` | 5.2:1 (vs white) | Metadata, timestamps, captions |
| Placeholder | `--color-placeholder` | `#66758A` | 4.6:1 (vs white) | Form placeholders |

### Brand Tokens (Calm Teal `#0FA3B1` Default)
| Token | CSS Variable | Hex / Value | Contrast Ratio | Usage |
|---|---|---|---|---|
| Primary Tint | `--color-primary-tint` | `#E6F6F8` | — | Active row backgrounds, badge fills |
| Primary 400 | `--color-primary-400` | `#35C2D0` | 4.6:1 (on dark) | Dark mode text/icons, active links |
| Primary 500 | `--color-primary-500` | `#0FA3B1` | — | Progress fills, chart accents |
| Primary 600 | `--color-primary-600` | `#0B7F8B` | 4.75:1 (vs white) | Solid button fills with white text |
| Primary 700 | `--color-primary-700` | `#0A6D78` | 5.4:1 (vs white) | Primary text on white and tint |
| Primary Text | `--color-primary-text` | `#0A6D78` | 5.4:1 (vs white) | Any text rendered in primary brand |
| On Primary | `--color-on-primary` | `#FFFFFF` | 4.75:1 | Text/icon on primary-600 buttons |

### Semantic Status Tokens
| Token | Tint (`-tint`) | Solid (`-solid`) | Text (`-text`) | Text Contrast (vs white) |
|---|---|---|---|---|
| **Success** | `#E7F8F0` | `#059669` | `#047857` | 5.3:1 |
| **Warning** | `#FEF3C7` | `#D97706` | `#B45309` | 4.8:1 |
| **Danger** | `#FDECEC` | `#DC2626` | `#B91C1C` | 5.6:1 |

### Dark Theme (`.dark-mode`)
* Background: `#0B1220`
* Surface: `#111A2B`
* Surface Hover: `#172338`
* Border: `#223049`
* Border Input: `#66788F`
* Text: `#E8EEF7`
* Text 2: `#C3CCD9`
* Muted: `#9AA9BF`
* Primary Text: `#35C2D0` (4.6:1 against dark surface)
* Buttons: Keep `#0B7F8B` fill with `#FFFFFF` text (4.75:1)

---

## 3. Typography & Spacing

* **Primary Font Stack**: `Poppins, 'Noto Sans Sinhala', 'Noto Sans Tamil', system-ui, sans-serif`
* **Weights**: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold)
* **Numeric Figures**: Every financial figure and table amount uses the `.num` class (`font-variant-numeric: tabular-nums`) and standard currency helper (`Rs. 50,000` / `-Rs. 5,000`).
* **Spacing Scale**: 4px baseline (`4, 8, 12, 16, 24, 32, 48px`).
* **Corner Radius**:
  * Inputs: `8px` (`rounded-lg`)
  * Cards & Containers: `12px` - `16px` (`rounded-xl` - `rounded-2xl`)
  * Buttons & Badges: Fully rounded (`rounded-full`) or standardized `rounded-xl`

---

## 4. UI Primitives (`src/components/ui/`)

1. **`Button`**: Variants (`primary`, `secondary`, `danger`, `ghost`), sizes (`sm`, `md`, `lg`), `loading` spinner state, icon slots, accessible focus rings.
2. **`Card` / `CardHeader`**: Clean surfaces using `border-border` and unified shadow tokens.
3. **`StatCard`**: Standard metric display card with label, formatted number, trend/subtext, and icon slot.
4. **`Badge`**: Tones (`neutral`, `primary`, `success`, `warning`, `danger`), paired with clear labels.
5. **`Field` / `Input` / `Select` / `Textarea`**: Standard form control with accessible `<label>`, hint, error state, and `aria-describedby` linking.
6. **`Switch`**: Accessible toggle component supporting keyboard space/enter.
7. **`SegmentedTabs`**: Unified tab switcher replacing fragmented custom pills.
8. **`Modal`**: Standard accessible dialog (`role="dialog"`, `aria-modal="true"`, focus trapping, ESC key listener, mobile bottom-sheet adaptation).
9. **`EmptyState`**: Standard friendly empty illustrations with title, helper description, and call-to-action button.
10. **`ProgressBar`**: Displays progress accompanied by actual target figures and percentage.
11. **`Skeleton`**: Accessible pulse placeholder for loading states.
12. **`PageContainer`**: Unified page width constraint (`max-w-6xl` default, `max-w-4xl` for focused documents/forms).
13. **`Icon`**: Single outline SVG icon set (stroke 1.9, rounded caps).
14. **`PasswordField`**: Accessible password input with show/hide toggle and keyboard support.
15. **`Sheet`**: Responsive side or bottom drawer modal with focus trapping and ESC support.
16. **`ToastProvider` / `useToast`**: Non-blocking toast notifications replacing disruptive alerts.
17. **`ConfirmProvider` / `useConfirm`**: Accessible promise-based confirmation modal replacing browser `window.confirm`.
18. **`PaymentMethodField`**: Semantic payment method dropdown supporting cash, transfer, cards, cheques, and standing orders.
19. **`BankSelect`**: Dropdown for selecting connected bank accounts with masked account numbers.

---

## 5. Rules & Guidelines

* **Accent Usage ~10%**: Primary color is reserved for primary actions, active navigation, and key progress indications. Avoid coloring large backgrounds or body text with accents.
* **Fill vs Text**: Use `*-solid` (`-600` or `-500`) for button fills, icons, and progress bars. ALWAYS use `*-text` (`-700` in light, `-400` in dark) for colored text.
* **No Hardcoded Hexes**: Use semantic Tailwind classes (`bg-surface`, `text-text`, `text-muted`, `border-border`, `bg-primary-tint`) or CSS variables (`var(--color-...)`).
* **Motion Accessibility**: All hover lifts and transitions respect `@media (prefers-reduced-motion: reduce)`.

---

## 6. Page Patterns (Dashboard Standard)

Every screen in Fintarg must match the design quality, layout rhythm, and token consistency established by the Dashboard (`DashboardClient.tsx`):

### 6.1 Layout Rhythm & Canvas
* **Page Wrapper**: Every route must wrap its content with `<PageContainer>`:
  * Default (`max-w-6xl mx-auto space-y-6 w-full`) for dashboards, list views, and multi-column workspaces.
  * Narrow (`width="narrow"` / `max-w-4xl mx-auto space-y-6 w-full`) for single-purpose forms and settings documents.
  * No per-section ad hoc `max-w-*` overrides.
* **Page Header**: Every route begins with `<PageHeader>`:
  * `eyebrow`: Optional semantic category / context label in uppercase tracking (`text-primary-text`).
  * `title`: Semantic `h1` (`text-2xl font-bold tracking-tight text-text`).
  * `description`: Supporting guide sentence (`text-xs sm:text-sm text-muted`).
  * `actions`: Cluster of `<Button>` elements (`variant="primary"`, `variant="secondary"`) aligned right on desktop, wrapping on mobile.
  * Divider: Border bottom divider (`border-b border-border/80 pb-6`) separates header from page content.
* **Vertical Section Gap**: Sections are separated by exactly 24px (`space-y-6` or `gap-6`), aligning all cards on the 4px grid.

### 6.2 Card Anatomy
* **Standard Surface**:
  * Outer styling: `card bg-surface border border-card-border rounded-xl shadow-card`.
  * Padding: Uniform **24px desktop** (`p-6`) and **16px mobile** (`p-4` / `sm:p-6`).
  * Hoverable: Subtle lift on interactive cards (`hover:-translate-y-0.5 hover:shadow-card`).
* **Section Header**:
  * `<CardHeader>` or `<SectionHeader>` with 16px bold title (`text-base font-bold text-text`) and muted description (`text-xs text-muted mt-0.5`).
  * Right-aligned action slot for quick links, filters, or pills.

### 6.3 Stat Card Anatomy
* Metric cards use `<StatCard>` arranged in responsive grids (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5`):
  * **Label**: `text-xs font-semibold uppercase tracking-wider text-muted`.
  * **Value**: Tabular numeric format (`num text-2xl font-bold tracking-tight`).
  * **Icon Chip**: `w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0` with tone-specific tint fill (`bg-primary-tint`, `bg-success-tint`, `bg-danger-tint`, `bg-warning-tint`).
  * **Detail / Trend Pill**: `text-[11px] font-medium px-2 py-0.5 rounded-md` with tone-matched border.

### 6.4 Quick-Action Tile Anatomy
* Action shortcuts use standardized interactive rows:
  * Container: `p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-primary-500/50 transition-all text-xs font-semibold text-text flex items-center justify-between group`.
  * Leading icon box: `w-7 h-7 rounded-lg flex items-center justify-center` with tone-colored tint.
  * Trailing arrow: `Icon name="arrow-right" size={14}` in `text-muted` transitioning to `text-primary-text`.

### 6.5 Tabbed Interfaces
* Multi-view screens use `<SegmentedTabs>`:
  * Pill container: `rounded-xl bg-surface-hover border border-border p-1 gap-1.5`.
  * Active tab: `bg-surface text-text shadow-sm font-semibold border border-border/80 rounded-xl`.
  * Inactive tab: `text-muted hover:text-text hover:bg-surface/50 rounded-xl`.
  * URL Synchronization: Active tab must always be mirrored to the URL query string (`?tab=...`) so refresh and browser history work reliably.
  * Mobile adaptation: Horizontal scroll with hidden scrollbar (`overflow-x-auto no-scrollbar`).

### 6.6 Forms, Tables & State Standards
* **Form Grid**: Form fields must be arranged in `<FormGrid>` (1 column below 768px, 2 columns on desktop) with accessible `<FormField>` wrappers.
* **Money & Date Fields**: Financial inputs must use `<MoneyField>` with `Rs.` prefix, numeric formatting, and tabular numbers. Dates must use `<DateField>`.
* **Data Presentation**: List data must use `<DataTable>` on desktop (>=768px) and automatically adapt to mobile cards or responsive list rows below 768px.
* **State Triad**:
  * **Loading**: `<Skeleton>` matching the actual target layout (cards, stat tiles, or table rows).
  * **Empty**: `<EmptyState>` with descriptive message and primary call-to-action button that populates the view.
  * **Error**: `<ErrorState>` with clear message and retry button.

---

## 7. Component Catalog (Extended Primitives)

All primitives are located in `frontend/src/components/ui/` and exported via `@/components/ui`:

| Component | Purpose & Accessibility | Props / Usage |
| :--- | :--- | :--- |
| **`FormField`** | Accessible form control wrapper with label, required asterisk, helper text, and error binding (`aria-describedby`). | `label`, `hint`, `error`, `required`, `id`, `children` |
| **`FormGrid`** | Responsive form layout (1 column on mobile, 2 columns at >=768px). | `cols` (1 \| 2 \| 3), `className`, `children` |
| **`MoneyField`** | Sri Lankan currency numeric input with `Rs.` prefix, thousand separators, and decimal support. | `value`, `onChange`, `currency`, `placeholder`, `hasError` |
| **`DateField`** | Standardized HTML date input styled according to design tokens. | `value`, `onChange`, `min`, `max`, `hasError` |
| **`Checkbox`** | Custom themed checkbox with checkmark SVG, focus ring, and disabled states. | `checked`, `onChange`, `label`, `description`, `disabled` |
| **`RadioGroup`** | Accessible radio group supporting vertical, horizontal, or card layout. | `options`, `value`, `onChange`, `layout` |
| **`SettingRow`** | Key-value settings row with title, description, and right-aligned interactive control. | `label`, `description`, `control`, `badge` |
| **`SectionHeader`** | Section title block with heading, subtitle, and optional action slot. | `title`, `description`, `action` |
| **`PageSection`** | Standardized layout wrapper with 24px vertical separation and semantic structure. | `title`, `description`, `action`, `children` |
| **`ListRow`** | Compact stacked row for mobile-adapted data lists. | `title`, `subtitle`, `badge`, `amount`, `actions` |
| **`DataTable`** | Dual-mode responsive table: renders tabular data on desktop (>=768px) and card list on mobile (<768px). | `columns`, `data`, `keyField`, `loading`, `emptyState` |
| **`FilterBar`** | Standardized search input and filter chip toolbar with `Clear all` trigger. | `search`, `onSearchChange`, `filters`, `onClear` |
| **`Tooltip`** | Accessible hover/focus popup explanation. | `content`, `children`, `position` |
| **`IconChip`** | Tone-tinted icon container (primary, success, warning, danger). | `icon`, `tone`, `size` |
| **`Avatar`** | User avatar with profile image fallback to initials gradient chip. | `name`, `src`, `fileId`, `size` ('sm' \| 'md' \| 'lg' \| 'xl') |
| **`ColorSwatch`** | Themed color circle button with selection ring and accessibility labeling. | `color`, `selected`, `onClick`, `ariaLabel` |
| **`ErrorState`** | Standard error presentation card with failure message and `Retry` action. | `title`, `message`, `onRetry` |
| **`Divider`** | Border-token divider with optional label chip. | `label`, `className` |

---

## 8. Do's and Don'ts (Hard Guardrails)

### Styling & Tokens
- **DO** use semantic CSS variables (`bg-surface`, `text-text`, `border-border`, `text-primary-text`, `bg-primary-tint`).
- **DO NOT** use raw Tailwind palette classes (`slate-900`, `zinc-500`, `teal-600`, `emerald-500`, etc.) in TSX.
- **DO NOT** use hardcoded hex colors (`#0FA3B1`, `#FFFFFF`, etc.) outside `globals.css` and `lib/theme.ts`.
- **DO NOT** use static inline styles (`style={{ background: '...' }}`). Static styling must always use Tailwind token classes.
- **DO** use inline `style={{}}` only for genuinely dynamic values (e.g. progress bar width percentages, chart bar heights, or dynamic user theme swatches).

### Components & Form Controls
- **DO** use `<Button>`, `<Input>`, `<Select>`, `<Textarea>`, `<Switch>`, `<Checkbox>` from `@/components/ui`.
- **DO NOT** introduce raw `<button>`, `<input>`, `<select>` outside `components/ui/`.
- **DO** use `useConfirm()` from `ConfirmProvider` for all destructive actions (centered Yes/No dialog).
- **DO NOT** introduce native `window.confirm()` or `window.alert()`.

### Layout & Spacing
- **DO** wrap full screens in `<PageContainer>` and `<PageHeader>`.
- **DO** separate distinct card sections by 24px (`gap-6` or `space-y-6`).
- **DO NOT** nest arbitrary per-section `max-w-4xl/5xl/6xl` wrappers inside standard pages.

---

## 9. How to Add a New Screen (Developer Workflow)

When creating a new route or screen in Fintarg V2, follow this checklist:

1. **Page Container & Header**:
   ```tsx
   import { PageContainer } from '@/components/ui/PageContainer';
   import { PageHeader } from '@/components/ui/PageHeader';
   import { PageSection } from '@/components/ui/PageSection';
   import { Button } from '@/components/ui/Button';

   export default function MyNewScreen() {
     return (
       <PageContainer>
         <PageHeader
           eyebrow="Financial Management"
           title="My Feature"
           description="Manage and track your feature data in one place."
           actions={
             <Button variant="primary" onClick={handleCreate}>
               Add Record
             </Button>
           }
         />
         <PageSection title="Overview">
           {/* Section content */}
         </PageSection>
       </PageContainer>
     );
   }
   ```

2. **Tabbed Navigation**:
   If the screen has multiple views, use `<SegmentedTabs>` and synchronize active state to the URL search parameter:
   ```tsx
   const searchParams = useSearchParams();
   const activeTab = searchParams?.get('tab') || 'overview';
   ```

3. **Forms**:
   Use `<FormGrid>` and `<FormField>`:
   ```tsx
   <FormGrid cols={2}>
     <FormField id="amount" label="Amount (LKR)" required error={errors.amount}>
       <MoneyField value={form.amount} onChange={val => setForm({ ...form, amount: val })} />
     </FormField>
     <FormField id="date" label="Date" required>
       <DateField value={form.date} onChange={val => setForm({ ...form, date: val })} />
     </FormField>
   </FormGrid>
   ```

4. **Data Lists**:
   Render tabular records using `<DataTable>` with responsive mobile card fallback.

5. **State Handling**:
   - Initial fetch: render `<Skeleton>` matching the card or table layout.
   - Zero items: render `<EmptyState>` with a descriptive explanation and action button.
   - Fetch error: render `<ErrorState>` with `onRetry` handler.

6. **Mutations & Destruction**:
   - Creation / update: show pending spinner on `<Button loading={isPending}>` and trigger `toast.success('Record added successfully')`.
   - Deletion: trigger `const ok = await confirm({ title: 'Delete Record', message: '...' })`.


