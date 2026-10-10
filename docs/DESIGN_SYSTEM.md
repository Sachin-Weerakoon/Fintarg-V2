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
