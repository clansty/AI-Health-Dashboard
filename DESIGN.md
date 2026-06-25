# AI Health Dashboard Design System

## 1. Atmosphere & Identity

A quiet operations console for repeated status checks. The signature is a dense dark command surface: muted zinc panels, compact telemetry rows, and status color used only where availability or account health changes meaning.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/page | `zinc-800 -> #1f2024` | N/A | `zinc-800`, `#1f2024` | App background gradient |
| Surface/card | `white-alpha-card` | N/A | `white/0.02`, `white/0.03`, `zinc-800/40` | Account, platform, and model cards |
| Border/default | `white-alpha-border` | N/A | `white/10`, `zinc-800` | Card rings and panel boundaries |
| Border/subtle | `white-alpha-subtle` | N/A | `white/5`, `zinc-700`, `zinc-700/60` | Dividers, progress tracks, tooltips |
| Text/primary | `zinc-50`, `zinc-100`, `zinc-200` | N/A | `zinc-50`, `zinc-100`, `zinc-200` | Headings, platform names, model names |
| Text/secondary | `zinc-300`, `zinc-400`, `zinc-500` | N/A | `zinc-300`, `zinc-400`, `zinc-500` | Labels, captions, ids, reset text |
| Text/muted | `zinc-600` | N/A | `zinc-600` | Missing data placeholders |
| Status/success | `emerald` | N/A | `emerald-300`, `emerald-400`, `emerald-500` | Normal accounts, usable capacity, loading accent |
| Status/warning | `amber` | N/A | `amber-300`, `amber-400`, `amber-500` | Rate limited, high utilization, Anthropic accent |
| Status/caution | `orange` | N/A | `orange-300`, `orange-400`, `orange-500` | Reauth and over-capacity reserve states |
| Status/error | `rose` | N/A | `rose-300`, `rose-400`, `rose-500` | Errors, blocked accounts, unavailable states |
| Platform/openai | `teal-emerald` | N/A | `teal-400 -> emerald-500` | OpenAI platform accent |
| Status/model-down | `red` | N/A | `red-400`, `red-500` | Model uptime bar unavailable state |

### Rules

- The product is dark-mode only today; add light tokens only when light mode is implemented.
- Status colors carry semantic state. Do not use success, warning, or error colors as decoration.
- Transparent white rings and tonal shifts are the main surface separators.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | `text-2xl` | 700 | Uno default | tight | Page title |
| H2 | `text-lg` | 600 | Uno default | 0 | Section headings and average values |
| H3 | `text-base` | 600 | Uno default | 0 | Platform card titles |
| Body/sm | `text-sm` | 400-600 | Uno default | 0 | Model names, summary pills |
| Caption | `text-xs` | 400-600 | Uno default | 0 | Status pills, ids, counts |
| Micro | `text-[11px]`, `text-[10px]` | 400-500 | Uno default | 0 | Dense telemetry labels and request details |

### Font Stack

- Primary: system UI through the browser default sans stack.
- Mono: system monospace via `font-mono` for account ids.

### Rules

- Use tabular numbers for counters, percentages, and cost displays.
- Keep dashboard copy compact; avoid large display type inside cards.

## 4. Spacing & Layout

### Base Unit

All spacing follows UnoCSS/Tailwind's 4px scale.

| Token | Value | Usage |
|-------|-------|-------|
| `0.5` | 2px | Fine alignment and tiny label offsets |
| `1` | 4px | Tight inline gaps |
| `1.5` | 6px | Dot-to-label spacing, dense vertical stacks |
| `2` | 8px | Default inline gap, account-card list gap |
| `2.5` | 10px | Compact account-card vertical padding |
| `3` | 12px | Card grid gap, compact card padding |
| `4` | 16px | Summary card padding, mobile page padding |
| `6` | 24px | Platform column gap, account section gap |
| `8` | 32px | Header bottom spacing |
| `10` | 40px | Major section separation |
| `12` | 48px | Loading state vertical padding |
| `20` | 80px | Model loading state vertical padding |

### Grid

- Max content width: `1700px`.
- Account summary: 1 column on mobile, 2 columns from `sm`.
- Account lists: 1 column until `xl`, then 2 platform columns.
- Model cards: 1 column mobile, 2 from `sm`, 3 from `lg`, 4 from `xl`.

### Rules

- Account cards are dense rows, not large marketing cards.
- Fixed-width labels and tabular counters prevent layout jitter during refresh.

## 5. Components

### Status Pill

- **Structure**: rounded inline pill with a 6px status dot, label, and optional muted detail.
- **Variants**: normal, rate-limited, error, other.
- **Spacing**: `gap-1.5`, `px-2`, `py-1`.
- **States**: status is informational; tooltip is allowed for error detail.
- **Accessibility**: use `title` only for supplemental detail, not required meaning.
- **Motion**: none.

### Metric Card

- **Structure**: rounded panel with accent bar/icon/title/count, stat pills, and average rows.
- **Variants**: platform-specific accent gradient.
- **Spacing**: `p-4`, `mb-3`, `gap-2`.
- **States**: loading is handled by the section, not the card.
- **Accessibility**: numbers are visible text, not icon-only.
- **Motion**: none.

### Account Card

- **Structure**: account id, status pill, capacity badges, then usage bars.
- **Variants**: status and capacity badges.
- **Spacing**: `px-3`, `py-2.5`, `gap-2`.
- **States**: loading skeleton for usage; error text when usage fetch fails.
- **Accessibility**: account id and status are plain text.
- **Motion**: usage bars transition width over 500ms.

### Model Card

- **Structure**: model icon/name/channel count and uptime bars.
- **Variants**: available and unavailable count badge.
- **Spacing**: `px-3.5`, `py-3`, `gap-2`.
- **States**: hover ring moves from `zinc-800` to `zinc-700`.
- **Accessibility**: model name remains visible text.
- **Motion**: color transition only.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 150ms | ease-out | Uptime tooltip opacity |
| Standard | 500ms | ease-in-out | Usage bar width update |

### Rules

- Animate opacity, color, or transform-like paint updates only.
- Loading states use existing spinner or pulse skeletons.

## 7. Depth & Surface

### Strategy

Mixed tonal shift and rings.

| Level | Value | Usage |
|-------|-------|-------|
| Page | `zinc-800 -> #1f2024` | Global background |
| Panel | `white/[0.03] ring-white/10` | Platform summary cards |
| Row | `white/[0.02] ring-white/10` | Account cards |
| Model | `zinc-800/40 ring-zinc-800` | Model cards |
| Tooltip | `zinc-700` | Uptime hover details |

Depth must stay quiet. Avoid heavy shadows, decorative blobs, or large floating cards.
