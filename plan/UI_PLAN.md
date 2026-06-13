# UI_PLAN.md — Finance Buddy Design System & Component Guide

> Production-grade UI/UX plan for Finance Buddy. Dark-first, data-dense, modern fintech aesthetic.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Libraries & Dependencies](#2-libraries--dependencies)
3. [Design Tokens](#3-design-tokens)
4. [Typography System](#4-typography-system)
5. [Layout Architecture](#5-layout-architecture)
6. [Component Implementation Guide](#6-component-implementation-guide)
   - [AppShell & AppGuard](#61-appshell--appguard)
   - [TopBar](#62-topbar)
   - [Sidebar](#63-sidebar)
   - [UI Primitives (Button, Input, Card, Badge, Modal, EmptyState)](#64-ui-primitives)
   - [SummaryCards](#65-summarycards)
   - [CategoryChart](#66-categorychart)
   - [BudgetCard & BudgetGrid](#67-budgetcard--budgetgrid)
   - [TransactionItem](#68-transactionitem)
   - [TransactionList](#69-transactionlist)
   - [TransactionForm](#610-transactionform)
   - [VoiceInput](#611-voiceinput)
   - [InsightsPanel](#612-insightspanel)
7. [Page Layouts](#7-page-layouts)
8. [Motion & Animation](#8-motion--animation)
9. [Responsive Strategy](#9-responsive-strategy)
10. [Accessibility](#10-accessibility)
11. [Dark Mode](#11-dark-mode)
12. [Implementation Order](#12-implementation-order)

---

## 1. Design Philosophy

**Identity:** Finance Buddy is a precision tool. The aesthetic borrows from Bloomberg Terminal meets Linear — dark surfaces, emerald-green as the single accent, sharp typographic hierarchy, zero decorative clutter. Every element earns its place by communicating data.

**Signature element:** A real-time animated "money pulse" ring on the dashboard summary — the total spend amount is surrounded by an arc that fills as the budget depletes, with a smooth animated stroke on mount. This is the one moment of flair; everything else is disciplined.

**Visual principles:**
- **Dark-first:** `#0A0F1E` base (richer than slate-950, feels premium), not black
- **One accent:** Emerald `#10B981` for positive/income; Rose `#F43F5E` for expense/over-budget
- **Data density:** Show more, scroll less. Cards are compact but readable.
- **No decorative borders everywhere:** Use surfaces and depth (box shadows + subtle gradients) instead of borders to separate regions
- **Micro-feedback:** Every interaction has a response — hover lifts, active presses, loading skeletons

---

## 2. Libraries & Dependencies

Install these packages. Each is justified below.

```bash
npm install \
  recharts \
  lucide-react \
  framer-motion \
  clsx \
  tailwind-merge \
  @radix-ui/react-dialog \
  @radix-ui/react-select \
  @radix-ui/react-tooltip \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-progress \
  date-fns \
  sonner
```

| Library | Role | Why not X? |
|---|---|---|
| **recharts** | Charts (donut, line, bar) | Lightweight, React-native, composable. Chart.js needs canvas refs. |
| **lucide-react** | All icons | Consistent stroke width, tree-shakeable, React-first |
| **framer-motion** | Animations (mount, hover, page transitions) | Declarative, performant, integrates with React state |
| **clsx + tailwind-merge** | Conditional className merging | Replaces a naive `cn()` helper — handles Tailwind conflicts properly |
| **@radix-ui/react-dialog** | Modal accessibility (focus trap, escape key, aria) | Headless = full styling control; handles a11y you'd otherwise miss |
| **@radix-ui/react-select** | Category/month dropdowns | Native `<select>` is unstyleable; this is accessible and composable |
| **@radix-ui/react-tooltip** | Budget bar tooltips | Accessible, keyboard-navigable |
| **@radix-ui/react-dropdown-menu** | TopBar account menu | Handles keyboard nav and aria automatically |
| **@radix-ui/react-progress** | Budget progress bars | Accessible progress semantics |
| **date-fns** | Date formatting, month arithmetic | Tiny, tree-shakeable, no Moment.js baggage |
| **sonner** | Toast notifications | Beautiful by default, stacks correctly, works with dark mode |

### tailwind.config.js additions

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#10B981',   // emerald-500
          dim: '#059669',       // emerald-600
          glow: '#6EE7B7',      // emerald-300 for glows
        },
        danger: '#F43F5E',      // rose-500
        warning: '#F59E0B',     // amber-500
        surface: {
          base:  '#0A0F1E',     // deepest bg
          card:  '#111827',     // card bg
          raised: '#1A2235',    // elevated card
          border: '#1F2D40',    // subtle border
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],  // amounts/numbers
      },
      boxShadow: {
        card:   '0 4px 24px -4px rgba(0,0,0,0.5)',
        glow:   '0 0 20px rgba(16,185,129,0.25)',
        danger: '0 0 20px rgba(244,63,94,0.20)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      keyframes: {
        'pulse-ring': {
          '0%, 100%': { opacity: 1 },
          '50%':       { opacity: 0.4 },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: 0 },
          to:   { transform: 'translateY(0)',   opacity: 1 },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'slide-up':   'slide-up 0.25s ease-out',
      },
    },
  },
};
```

### Google Fonts (add to `app/layout.tsx` or `_document.tsx`)

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link
  href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

---

## 3. Design Tokens

Use these throughout. Never hardcode hex values; use the Tailwind tokens defined above.

```
BACKGROUND HIERARCHY
  surface-base   #0A0F1E  — page background
  surface-card   #111827  — default card / sidebar
  surface-raised #1A2235  — hovered card, inner panels
  surface-border #1F2D40  — subtle dividers, borders

ACCENT SYSTEM
  brand          #10B981  — positive, CTA, income, on-budget
  brand-dim      #059669  — CTA hover state
  brand-glow     #6EE7B7  — glow/shimmer effects
  danger         #F43F5E  — expense, over-budget, destructive
  warning        #F59E0B  — approaching budget limit (>80%)

TEXT
  white          #FFFFFF  — primary headings
  slate-300      #CBD5E1  — body text
  slate-400      #94A3B8  — secondary labels
  slate-500      #64748B  — tertiary / placeholders
  brand          #10B981  — positive numbers, income

AMOUNTS (monospace)
  All currency values use font-mono and tabular-nums
  Expense amounts: text-white or text-danger if over budget
  Income amounts: text-brand
```

---

## 4. Typography System

```
Display (Plus Jakarta Sans)
  H1  — 32px / 700 / tracking -0.02em   → Page titles
  H2  — 24px / 600 / tracking -0.01em   → Section headers
  H3  — 18px / 600                       → Card titles

Body (Inter)
  base   — 14px / 400                    → General body text
  sm     — 13px / 400                    → Labels, metadata
  xs     — 12px / 500 uppercase          → Section eyebrows, table headers

Mono (JetBrains Mono)
  lg     — 28px / 500 tabular-nums       → Hero amounts (SummaryCard)
  base   — 14px / 400 tabular-nums       → Transaction amounts
  sm     — 13px / 400 tabular-nums       → Budget numbers
```

Apply globally:
```css
/* globals.css */
body {
  font-family: 'Inter', sans-serif;
  background-color: #0A0F1E;
  color: #CBD5E1;
  -webkit-font-smoothing: antialiased;
}

h1, h2, h3 {
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #FFFFFF;
}

.mono {
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

---

## 5. Layout Architecture

### Desktop (≥ 1024px)

```
┌─────────────────────────────────────────────────────────┐
│  TOPBAR: Logo · Month Picker · Search · Notifications · Avatar │
├──────────────────┬──────────────────────────────────────┤
│                  │                                       │
│   SIDEBAR        │   MAIN CONTENT                        │
│   280px fixed    │   flex-1, scrollable                  │
│                  │                                       │
│   Logo + tagline │   Page title + actions                │
│                  │   ─────────────────────               │
│   ● Dashboard    │   Content area (page-specific)        │
│   ○ Transactions │                                       │
│   ○ Add expense  │                                       │
│   ○ Budgets      │                                       │
│   ○ Insights     │                                       │
│   ○ Settings     │                                       │
│                  │                                       │
│   ─── (divider)  │                                       │
│   Monthly budget │                                       │
│   usage summary  │                                       │
│                  │                                       │
└──────────────────┴──────────────────────────────────────┘
```

### Mobile (< 1024px)

- Sidebar hidden; replaced by a bottom navigation bar (5 icons)
- TopBar shows hamburger → slides in a drawer/sheet
- Content scrolls vertically
- FAB (floating action button) for "Add expense" fixed bottom-right

### Spacing scale (use Tailwind defaults)

```
Page padding:     px-6 py-6 (desktop) → px-4 py-4 (mobile)
Card padding:     p-6 (large) / p-4 (compact)
Card gap:         gap-4 (tight grids) / gap-6 (generous)
Section gap:      space-y-6
```

---

## 6. Component Implementation Guide

### 6.1 AppShell & AppGuard

**Current problem:** Plain loading spinner; no branded state. No sidebar mini-summary.

**New AppShell:**
- Remove `TopBar` from inside AppShell — TopBar becomes part of layout root
- Sidebar takes `user` prop to show avatar + name at bottom
- Main content area has a subtle top gradient on scroll (sticky header fade)
- Page wrapper adds `animate-slide-up` on route change via framer-motion `AnimatePresence`

```tsx
// AppShell.tsx — key structure
<div className="flex h-screen overflow-hidden bg-surface-base">
  <Sidebar />
  <div className="flex flex-1 flex-col overflow-hidden">
    <TopBar />
    <main className="flex-1 overflow-y-auto px-6 py-6 lg:px-8">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </main>
  </div>
</div>
```

**New AppGuard:**
- Branded loading screen with animated Finance Buddy logo mark (pulsing ring around a ₹ or $ symbol)
- Use framer-motion to animate the logo on mount

```tsx
// Loading state — branded skeleton
<div className="flex h-screen items-center justify-center bg-surface-base">
  <motion.div
    animate={{ scale: [1, 1.05, 1], opacity: [0.6, 1, 0.6] }}
    transition={{ repeat: Infinity, duration: 2 }}
  >
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 ring-2 ring-brand/30">
      <span className="font-display text-2xl font-bold text-brand">₹</span>
    </div>
  </motion.div>
  <p className="mt-4 text-sm text-slate-400">Loading Finance Buddy…</p>
</div>
```

---

### 6.2 TopBar

**Current problem:** Static text, no interactive elements, no user context.

**New TopBar features:**
- Left: Finance Buddy logo mark (icon + wordmark)
- Center: Month/period picker (← June 2025 →) — this controls the whole app's data context
- Right: Global search icon, notification bell (badge count), user avatar dropdown

```tsx
// Key elements

// Month Picker (center)
<div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-2">
  <button onClick={prevMonth}><ChevronLeft size={16} /></button>
  <span className="min-w-[120px] text-center text-sm font-semibold text-white">
    {format(activeMonth, 'MMMM yyyy')}
  </span>
  <button onClick={nextMonth}><ChevronRight size={16} /></button>
</div>

// User dropdown (Radix DropdownMenu)
<DropdownMenu>
  <DropdownMenuTrigger>
    <div className="flex items-center gap-2 rounded-2xl border border-surface-border px-3 py-2">
      <div className="h-7 w-7 rounded-full bg-brand/20 text-brand ...">
        {initials}
      </div>
      <span className="text-sm text-slate-300">{firstName}</span>
      <ChevronDown size={14} className="text-slate-500" />
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>Settings</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem className="text-danger">Sign out</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Props:**
```ts
interface TopBarProps {
  activeMonth: Date;
  onMonthChange: (date: Date) => void;
  user: { name: string; email: string; avatarUrl?: string };
  notificationCount?: number;
}
```

---

### 6.3 Sidebar

**Current problem:** Plain links, no active state, no visual hierarchy, no contextual widget.

**New Sidebar features:**
- Logo at top with icon mark
- Nav items with icons (Lucide), active state uses brand highlight
- Active item: `bg-brand/10 text-brand border-l-2 border-brand` + icon fill
- Section divider between main nav and utility nav (Settings)
- **Mini budget widget at bottom:** Small circular arc showing this month's overall budget health — a `<svg>` arc with % fill. Updates live.
- User info card at the very bottom above the budget widget

```tsx
const navItems = [
  { href: '/dashboard',        label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/transactions',     label: 'Transactions', icon: ArrowLeftRight  },
  { href: '/transactions/new', label: 'Add expense',  icon: PlusCircle      },
  { href: '/budgets',          label: 'Budgets',      icon: Target          },
  { href: '/insights',         label: 'Insights',     icon: Sparkles        },
];

const utilItems = [
  { href: '/settings', label: 'Settings', icon: Settings2 },
];

// Active nav item styling
const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
className={cn(
  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
  isActive
    ? "bg-brand/10 text-brand"
    : "text-slate-400 hover:bg-surface-raised hover:text-white"
)}

// Mini budget ring (bottom of sidebar)
// Use a small SVG arc — see SummaryCards section for arc technique
<div className="mt-auto pt-4 border-t border-surface-border">
  <BudgetMiniWidget spent={12400} total={16500} />
</div>
```

---

### 6.4 UI Primitives

#### Button

Expand the current Button to support variants and sizes:

```tsx
// Variants: primary | secondary | ghost | danger | outline
// Sizes: sm | md (default) | lg
// States: loading (spinner), disabled, icon-only

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;      // left icon
  iconRight?: React.ReactNode; // right icon
}

const variants = {
  primary:   'bg-brand text-white hover:bg-brand-dim shadow-glow hover:shadow-none',
  secondary: 'bg-surface-raised text-slate-200 hover:bg-surface-border',
  ghost:     'text-slate-400 hover:text-white hover:bg-surface-raised',
  danger:    'bg-danger/10 text-danger hover:bg-danger hover:text-white',
  outline:   'border border-surface-border text-slate-300 hover:border-brand hover:text-brand',
};
```

#### Input

Expand to support label, helper text, error state, left/right adornments:

```tsx
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;    // e.g. currency symbol "₹"
  suffix?: React.ReactNode;    // e.g. unit or icon
}

// Structure:
<div className="space-y-1.5">
  {label && <label className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</label>}
  <div className="relative">
    {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 font-mono text-slate-400">{prefix}</span>}
    <input className={cn(baseStyles, prefix && 'pl-8', error && errorStyles)} />
    {suffix && <span className="absolute right-4 ...">{suffix}</span>}
  </div>
  {error  && <p className="text-xs text-danger">{error}</p>}
  {hint   && <p className="text-xs text-slate-500">{hint}</p>}
</div>
```

#### Card

Add variants: `default`, `raised`, `glass`, `highlighted`:

```tsx
const cardVariants = {
  default:     'bg-surface-card border border-surface-border',
  raised:      'bg-surface-raised border border-surface-border shadow-card',
  glass:       'bg-white/5 border border-white/10 backdrop-blur-md',
  highlighted: 'bg-brand/5 border border-brand/20',
};
```

#### Badge

Add semantic variants:

```tsx
const badgeVariants = {
  default:  'bg-surface-raised text-slate-300',
  success:  'bg-brand/10 text-brand',
  danger:   'bg-danger/10 text-danger',
  warning:  'bg-warning/10 text-warning',
  income:   'bg-brand/15 text-brand',
  expense:  'bg-danger/10 text-danger',
};

// Usage:
<Badge variant="expense">Food</Badge>
<Badge variant="income">+ ₹25,000</Badge>
```

#### Modal

Replace with Radix Dialog for proper focus trap + escape key + aria:

```tsx
import * as Dialog from '@radix-ui/react-dialog';

// Structure:
<Dialog.Root open={open} onOpenChange={onClose}>
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-40 bg-surface-base/80 backdrop-blur-sm animate-in fade-in" />
    <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2
      rounded-4xl border border-surface-border bg-surface-card p-6 shadow-2xl animate-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <Dialog.Title className="font-display text-lg font-semibold text-white">{title}</Dialog.Title>
        <Dialog.Close asChild>
          <button className="rounded-xl p-1.5 text-slate-500 hover:text-white hover:bg-surface-raised">
            <X size={16} />
          </button>
        </Dialog.Close>
      </div>
      <div className="mt-5">{children}</div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

#### EmptyState

Upgrade with icon, title, and CTA:

```tsx
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

// Visual: centered icon in a soft glow circle, title, subtitle, optional button
<div className="flex flex-col items-center justify-center rounded-4xl border border-dashed border-surface-border py-16 px-8 text-center">
  {Icon && (
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-raised">
      <Icon size={24} className="text-slate-500" />
    </div>
  )}
  <p className="font-display text-base font-semibold text-white">{title}</p>
  {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
  {action && (
    <Button variant="outline" className="mt-4" onClick={action.onClick}>{action.label}</Button>
  )}
</div>
```

---

### 6.5 SummaryCards

**Current problem:** Hardcoded labels, no real data, no visual differentiation, no trend indicators.

**New design:** Three cards in a row. Each card has:
- Icon in a colored circle (top-left)
- Label (small, uppercase, spaced)
- Hero amount in monospace
- Trend chip: "+12% vs last month" in green/red

**The signature element** — the "spent" card has a SVG arc ring that animates on mount:

```tsx
interface SummaryCardsProps {
  spent: number;
  income: number;
  budgetTotal: number;
  currency: string;
  trends: { spent: number; income: number }; // % change vs last month
}

// Card 1 — Total Spent (with arc ring)
<Card variant="raised" className="relative overflow-hidden">
  {/* Background glow when overspent */}
  {isOverBudget && <div className="absolute inset-0 rounded-4xl bg-danger/5" />}

  <div className="flex items-start justify-between">
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total spent</p>
      <p className="mt-2 font-mono text-3xl font-medium text-white tabular-nums">
        {formatCurrency(spent, currency)}
      </p>
      <TrendChip value={trends.spent} />
    </div>
    {/* SVG Arc */}
    <BudgetArc spent={spent} total={budgetTotal} />
  </div>
  <p className="mt-4 text-xs text-slate-500">of {formatCurrency(budgetTotal, currency)} budget</p>
</Card>

// Card 2 — Total Income
<Card variant="raised">
  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand/10">
    <TrendingUp size={18} className="text-brand" />
  </div>
  <p className="mt-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Income</p>
  <p className="mt-1 font-mono text-3xl font-medium text-brand tabular-nums">
    {formatCurrency(income, currency)}
  </p>
  <TrendChip value={trends.income} />
</Card>

// Card 3 — Budget Health (percentage gauge)
// ...similar pattern with a health score and color coding

// TrendChip component
function TrendChip({ value }: { value: number }) {
  const up = value >= 0;
  return (
    <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
      up ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand"
    )}>
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(value)}% vs last month
    </div>
  );
}

// BudgetArc SVG (the signature element)
function BudgetArc({ spent, total }: { spent: number; total: number }) {
  const pct = Math.min(spent / total, 1);
  const r = 28, cx = 36, cy = 36;
  const circumference = 2 * Math.PI * r;
  const strokeDashoffset = circumference * (1 - pct);
  const color = pct > 1 ? '#F43F5E' : pct > 0.8 ? '#F59E0B' : '#10B981';

  return (
    <svg width="72" height="72" className="-rotate-90">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F2D40" strokeWidth="6" />
      <motion.circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}
```

---

### 6.6 CategoryChart

**Current problem:** Empty placeholder rectangle.

**New design:** A side-by-side layout — Recharts donut (left) + horizontal legend with amounts (right).

```tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface CategoryChartProps {
  data: { name: string; amount: number; color: string; icon: string }[];
  currency: string;
  total: number;
}

// Layout
<Card variant="raised">
  <div className="flex items-center justify-between">
    <h3 className="font-display text-base font-semibold text-white">Spending by category</h3>
    <Badge variant="default">{format(activeMonth, 'MMM yyyy')}</Badge>
  </div>

  <div className="mt-6 grid grid-cols-[1fr_1fr] gap-6">
    {/* Donut */}
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={88}
            dataKey="amount" paddingAngle={3}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-mono text-xs text-slate-400">Total</p>
        <p className="font-mono text-lg font-medium text-white">{formatCurrency(total, currency)}</p>
      </div>
    </div>

    {/* Legend */}
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.name} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
            <span className="text-sm text-slate-400">{item.icon} {item.name}</span>
          </div>
          <span className="font-mono text-sm font-medium text-white">
            {formatCurrency(item.amount, currency)}
          </span>
        </div>
      ))}
    </div>
  </div>
</Card>
```

**Custom tooltip:**
```tsx
function CustomTooltip({ active, payload, currency }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-raised px-3 py-2 shadow-card">
      <p className="text-xs text-slate-400">{d.icon} {d.name}</p>
      <p className="font-mono text-sm font-semibold text-white">{formatCurrency(d.amount, currency)}</p>
    </div>
  );
}
```

---

### 6.7 BudgetCard & BudgetGrid

**Current problem:** Complete placeholder.

**BudgetCard new design:**
- Category icon + name + month budget amount (editable inline)
- Radix Progress bar that fills with color (green → amber → red)
- Spent amount / budget amount label
- Edit button that opens an inline input or modal

```tsx
interface BudgetCardProps {
  category: { id: string; name: string; icon: string; color: string };
  budget: number;
  spent: number;
  currency: string;
  onEdit: (categoryId: string, newAmount: number) => void;
}

const pct = budget > 0 ? (spent / budget) * 100 : 0;
const status = pct > 100 ? 'over' : pct > 80 ? 'warning' : 'ok';

<Card variant="raised" className="group">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl"
        style={{ background: category.color + '20' }}>
        {category.icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{category.name}</p>
        <p className="text-xs text-slate-500">
          {formatCurrency(spent, currency)} of {formatCurrency(budget, currency)}
        </p>
      </div>
    </div>
    <Button variant="ghost" size="sm"
      className="opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={() => setEditing(true)}>
      <Pencil size={14} />
    </Button>
  </div>

  {/* Progress bar */}
  <div className="mt-4">
    <Progress.Root className="h-2 overflow-hidden rounded-full bg-surface-border" value={Math.min(pct, 100)}>
      <Progress.Indicator
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${Math.min(pct, 100)}%`,
          background: status === 'over' ? '#F43F5E' : status === 'warning' ? '#F59E0B' : '#10B981',
        }}
      />
    </Progress.Root>
    <div className="mt-1.5 flex justify-between">
      <span className="text-xs text-slate-500">{pct.toFixed(0)}% used</span>
      {status === 'over' && (
        <span className="text-xs font-medium text-danger">
          Over by {formatCurrency(spent - budget, currency)}
        </span>
      )}
      {status === 'warning' && (
        <span className="text-xs font-medium text-warning">Almost at limit</span>
      )}
    </div>
  </div>
</Card>
```

**BudgetGrid:**
```tsx
// Month selector at top + "Add category budget" CTA
// Grid: 2 cols on md, 3 cols on xl
<div>
  <div className="flex items-center justify-between mb-6">
    <h2 className="font-display text-xl font-semibold text-white">Budgets</h2>
    <Button variant="primary" icon={<Plus size={16} />} onClick={openAddModal}>
      Add budget
    </Button>
  </div>
  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
    {budgets.map(b => <BudgetCard key={b.category.id} {...b} onEdit={handleEdit} />)}
    {budgets.length === 0 && (
      <EmptyState icon={Target} title="No budgets set"
        description="Set a monthly limit for each spending category."
        action={{ label: 'Add your first budget', onClick: openAddModal }} />
    )}
  </div>
</div>
```

---

### 6.8 TransactionItem

**Current problem:** Placeholder row.

**New design:** A single horizontal row with:
- Left: Category icon circle (colored)
- Center: Merchant name (bold) + description + date
- Right: Amount (red for expense, green for income) + category badge

```tsx
interface TransactionItemProps {
  transaction: Transaction;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

<motion.div
  layout
  initial={{ opacity: 0, y: 4 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, x: -8 }}
  className="group flex items-center gap-4 rounded-2xl px-4 py-3 transition-colors hover:bg-surface-raised"
>
  {/* Icon */}
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg"
    style={{ background: category.color + '18' }}>
    {category.icon}
  </div>

  {/* Details */}
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <p className="truncate text-sm font-semibold text-white">{merchant || description}</p>
      {source === 'voice' && (
        <Tooltip content="Added via voice">
          <Mic size={12} className="text-slate-500" />
        </Tooltip>
      )}
    </div>
    <p className="truncate text-xs text-slate-500">
      {category.name} · {format(date, 'd MMM')}
    </p>
  </div>

  {/* Amount */}
  <div className="text-right">
    <p className={cn("font-mono text-sm font-semibold tabular-nums",
      type === 'income' ? 'text-brand' : 'text-white'
    )}>
      {type === 'income' ? '+' : '−'}{formatCurrency(amount, currency)}
    </p>
  </div>

  {/* Actions (hover reveal) */}
  <div className="flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
    <button onClick={() => onEdit?.(id)} className="rounded-lg p-1.5 text-slate-500 hover:text-white hover:bg-surface-border">
      <Pencil size={13} />
    </button>
    <button onClick={() => onDelete?.(id)} className="rounded-lg p-1.5 text-slate-500 hover:text-danger hover:bg-danger/10">
      <Trash2 size={13} />
    </button>
  </div>
</motion.div>
```

---

### 6.9 TransactionList

**Current problem:** Blank placeholder.

**New design:** Filterable, grouped by date, with search and category filter.

```tsx
interface TransactionListProps {
  transactions: Transaction[];
  onAdd?: () => void;
}

// Features:
// 1. Search bar (filters by description/merchant)
// 2. Category filter chips (scrollable row)
// 3. Type filter: All | Expenses | Income
// 4. Grouped by date with sticky date headers
// 5. AnimatePresence wraps each item for smooth remove animations

// Structure:
<Card variant="raised">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-display text-base font-semibold text-white">Transactions</h3>
    <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onAdd}>Add</Button>
  </div>

  {/* Filters */}
  <div className="space-y-3 mb-5">
    <Input prefix={<Search size={14} />} placeholder="Search transactions…"
      value={search} onChange={e => setSearch(e.target.value)} />
    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
      {['All', 'Food', 'Transport', 'Shopping', ...].map(cat => (
        <button key={cat}
          className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors",
            activeFilter === cat ? 'bg-brand text-white' : 'bg-surface-raised text-slate-400 hover:text-white'
          )}
          onClick={() => setActiveFilter(cat)}
        >{cat}</button>
      ))}
    </div>
  </div>

  {/* Grouped list */}
  <div className="space-y-4">
    {groupedTransactions.map(({ date, items }) => (
      <div key={date}>
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-600">{date}</p>
        <AnimatePresence>
          {items.map(tx => <TransactionItem key={tx.id} transaction={tx} onEdit={...} onDelete={...} />)}
        </AnimatePresence>
      </div>
    ))}
  </div>

  {filtered.length === 0 && (
    <EmptyState icon={Receipt} title="No transactions found"
      description="Try adjusting your filters or add a new transaction."
      action={{ label: 'Add transaction', onClick: onAdd }} />
  )}
</Card>
```

---

### 6.10 TransactionForm

**Current problem:** Complete placeholder — this is the most critical form in the app.

**New design:** A rich, friendly form in a Modal (Radix Dialog) with three input modes:

```tsx
// Modes: 'manual' | 'voice' (voice pre-fills form fields)

// Fields:
// 1. Amount (large, prominent, centered at top)
// 2. Type toggle: Expense / Income
// 3. Description / merchant
// 4. Category (Radix Select with category icons)
// 5. Date picker (native date input, styled)
// 6. Notes (optional, collapsible)

// Amount field — make it the hero:
<div className="text-center py-4">
  <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-2">Amount</p>
  <div className="flex items-center justify-center gap-2">
    <span className="font-mono text-4xl text-slate-500">{currencySymbol}</span>
    <input
      type="number"
      placeholder="0.00"
      className="w-40 bg-transparent text-center font-mono text-4xl font-medium text-white
        outline-none placeholder:text-slate-700 [appearance:textfield]"
    />
  </div>
</div>

// Type toggle
<div className="flex rounded-2xl bg-surface-base p-1">
  {(['expense', 'income'] as const).map(t => (
    <button key={t}
      className={cn("flex-1 rounded-xl py-2 text-sm font-semibold capitalize transition-all",
        type === t
          ? t === 'expense' ? 'bg-danger/10 text-danger' : 'bg-brand/10 text-brand'
          : 'text-slate-500 hover:text-slate-300'
      )}
      onClick={() => setType(t)}
    >{t}</button>
  ))}
</div>

// Category select (Radix)
<Select.Root value={categoryId} onValueChange={setCategoryId}>
  <Select.Trigger className="flex w-full items-center justify-between rounded-2xl border border-surface-border bg-surface-base px-4 py-3 text-sm">
    <Select.Value placeholder="Pick a category" />
    <ChevronDown size={14} className="text-slate-500" />
  </Select.Trigger>
  <Select.Portal>
    <Select.Content className="rounded-2xl border border-surface-border bg-surface-card shadow-2xl overflow-hidden">
      <Select.Viewport className="p-2 space-y-0.5">
        {categories.map(cat => (
          <Select.Item key={cat.id} value={cat.id}
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300
              hover:bg-surface-raised hover:text-white outline-none data-[highlighted]:bg-surface-raised">
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </Select.Item>
        ))}
      </Select.Viewport>
    </Select.Content>
  </Select.Portal>
</Select.Root>

// Voice input integration: VoiceInput appears as a tab/mode toggle at top of modal
<div className="flex rounded-2xl bg-surface-base p-1 mb-5">
  <button onClick={() => setMode('manual')}>Manual</button>
  <button onClick={() => setMode('voice')}>
    <Mic size={14} /> Voice
  </button>
</div>
{mode === 'voice' && <VoiceInput onParsed={prefillForm} />}
```

---

### 6.11 VoiceInput

**Current problem:** Static placeholder.

**New design:** A contained component with mic button, live waveform, transcript, and parsed preview.

```tsx
// States: idle → listening → processing → done | error

// Idle state
<button onClick={startListening}
  className="flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 ring-1 ring-brand/30
    hover:bg-brand/20 hover:ring-brand/50 transition-all">
  <Mic size={24} className="text-brand" />
</button>

// Listening state — animated ring
<motion.button
  animate={{ boxShadow: ['0 0 0 0 rgba(16,185,129,0.4)', '0 0 0 20px rgba(16,185,129,0)'] }}
  transition={{ repeat: Infinity, duration: 1.5 }}
  className="flex h-16 w-16 items-center justify-center rounded-full bg-brand ring-2 ring-brand/50">
  <MicOff size={24} className="text-white" />
</motion.button>

// Live transcript display
{transcript && (
  <p className="mt-4 text-center text-sm text-slate-300 italic leading-relaxed">
    "{transcript}"
  </p>
)}

// Processing state
<div className="flex items-center gap-2 text-sm text-slate-400">
  <Loader2 size={14} className="animate-spin text-brand" />
  Understanding your input…
</div>

// Parsed preview (before confirming)
{parsed && (
  <div className="mt-4 rounded-2xl border border-brand/20 bg-brand/5 p-4 space-y-2">
    <p className="text-xs font-semibold uppercase tracking-widest text-brand">Parsed</p>
    <div className="flex justify-between">
      <span className="text-sm text-slate-400">Amount</span>
      <span className="font-mono text-sm font-semibold text-white">{formatCurrency(parsed.amount)}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-slate-400">Category</span>
      <span className="text-sm text-white">{parsed.category_suggestion}</span>
    </div>
    <div className="flex justify-between">
      <span className="text-sm text-slate-400">Merchant</span>
      <span className="text-sm text-white">{parsed.merchant}</span>
    </div>
    <Button variant="primary" className="w-full mt-2" onClick={() => onParsed(parsed)}>
      Use this →
    </Button>
  </div>
)}

// Props:
interface VoiceInputProps {
  onParsed: (data: ParsedTransaction) => void;
  onError?: (err: string) => void;
}
```

---

### 6.12 InsightsPanel

**Current problem:** Complete placeholder.

**New design:** A loading state (skeleton + streaming effect) → rendered insight with structured tip cards.

```tsx
// States: idle (with "Generate" CTA) | loading (skeleton) | loaded | error

// Idle
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
    <Sparkles size={24} className="text-brand" />
  </div>
  <p className="font-display text-base font-semibold text-white">Ready to analyse {monthName}</p>
  <p className="mt-1 text-sm text-slate-400">Get AI-powered tips based on your spending.</p>
  <Button variant="primary" icon={<Sparkles size={14} />} className="mt-5" onClick={generate}>
    Generate insights
  </Button>
</div>

// Loading skeleton
<div className="space-y-3 animate-pulse">
  <div className="h-4 w-3/4 rounded-full bg-surface-raised" />
  <div className="h-4 w-1/2 rounded-full bg-surface-raised" />
  <div className="h-4 w-2/3 rounded-full bg-surface-raised" />
</div>

// Loaded — summary + tip cards
<div>
  <p className="text-sm leading-relaxed text-slate-300">{summary}</p>

  <div className="mt-5 space-y-3">
    {tips.map((tip, i) => (
      <motion.div key={i}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.08 }}
        className="flex gap-3 rounded-2xl border border-surface-border bg-surface-raised px-4 py-3">
        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10">
          <span className="text-xs font-bold text-brand">{i + 1}</span>
        </div>
        <p className="text-sm text-slate-300">{tip}</p>
      </motion.div>
    ))}
  </div>

  <button onClick={generate}
    className="mt-4 flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors">
    <RefreshCw size={11} /> Regenerate
  </button>
</div>
```

---

## 7. Page Layouts

### Dashboard (`/dashboard`)

```
┌── Page title: "Good morning, [Name]" + date ─────────────────┐
│                                                               │
│  [SummaryCards — 3 col grid]                                  │
│                                                               │
│  [CategoryChart — 6 col]   [InsightsPanel — 6 col]           │
│                                                               │
│  [TrendChart — full width]                                    │
│                                                               │
│  [TransactionList — recent 10, full width]                    │
└───────────────────────────────────────────────────────────────┘
```

TrendChart: A Recharts `AreaChart` or `BarChart` showing daily spend for the month.

### Transactions (`/transactions`)

```
┌── "Transactions" + month badge + "Add" button ───────────────┐
│                                                              │
│  [Search + filter chips — full width]                        │
│                                                              │
│  [TransactionList — full width, all transactions]            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Add Expense (`/transactions/new`)

Opens the TransactionForm modal. Can also open via FAB from any page.

### Budgets (`/budgets`)

```
┌── "Budgets" + month picker + "Add budget" button ────────────┐
│                                                              │
│  [BudgetGrid — 2-3 col grid of BudgetCards]                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Insights (`/insights`)

```
┌── "Insights" + month badge + "Generate" button ──────────────┐
│                                                              │
│  [InsightsPanel — full width]                                │
│                                                              │
│  [CategoryChart — half] [BudgetBars summary — half]          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Motion & Animation

Use framer-motion for all non-trivial animations.

| Trigger | Animation | Duration |
|---|---|---|
| Page route change | slide-up + fade-in | 200ms |
| Card mount | fade-in + translateY(8px→0) | 200ms, staggered |
| BudgetArc | strokeDashoffset 0→value | 1000ms easeOut |
| Transaction delete | fade-out + collapse height | 250ms |
| Voice listening ring | pulse-glow (ring scale) | 1500ms infinite |
| Insight tips | staggered fade-in | 80ms per item |
| SummaryCard numbers | count-up from 0 (optional) | 800ms |
| Modal open/close | scale from 0.95 + fade | 150ms |

**Reduced motion:** Always wrap animations with:
```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Pass as condition to framer-motion's `animate` or use their useReducedMotion hook
```

---

## 9. Responsive Strategy

### Breakpoints (Tailwind defaults)

| Breakpoint | Width | Layout |
|---|---|---|
| Default | < 640px | Single column, bottom nav |
| sm | ≥ 640px | 2-col grids |
| md | ≥ 768px | 2-col content grids |
| lg | ≥ 1024px | Sidebar visible, 3-col grids |
| xl | ≥ 1280px | Wider sidebar, denser layout |

### Mobile-specific:

- **Sidebar:** `hidden lg:block` → replaced by:
  ```tsx
  // Bottom navigation (mobile only)
  <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-surface-border
    bg-surface-card px-2 py-2 lg:hidden">
    {mobileNavItems.map(item => <MobileNavItem key={item.href} {...item} />)}
  </nav>
  ```
- **FAB:** `fixed bottom-20 right-4 lg:hidden` — opens TransactionForm
- **TopBar on mobile:** Logo left, avatar right (no month picker — move to page header)
- **Cards:** Stack to 1 column on mobile
- **TransactionItem:** Hide action buttons, reveal on long-press or swipe (Phase 2)

---

## 10. Accessibility

- All interactive elements have `focus-visible` ring styles (use `focus-visible:ring-2 focus-visible:ring-brand`)
- Radix primitives handle `role`, `aria-label`, focus trapping, and keyboard navigation automatically
- Color is never the only indicator: use icons + text alongside color for budget status
- Contrast: all text on `surface-card` (#111827) meets WCAG AA (slate-300 on dark bg = 7:1 ratio)
- `aria-live="polite"` on voice transcript area for screen reader updates
- Form labels always present (use `sr-only` if visually hidden)
- Keyboard shortcut: `N` opens new transaction form; `Escape` closes modals (handled by Radix)

---

## 11. Dark Mode

The app is **dark-only** (no light mode toggle needed for MVP). The existing component files already mix dark/light variants — remove the `bg-white` / `dark:bg-slate-900` pattern everywhere and replace with the token system from Section 3.

Set `darkMode: 'class'` in tailwind.config.js and add `class="dark"` to `<html>` in layout.tsx:

```tsx
// app/layout.tsx
<html lang="en" className="dark">
```

All color values should reference the `surface-*` and `brand` tokens defined in the config.

---

## 12. Implementation Order

Tackle components in this sequence to stay unblocked:

```
Foundation
  1. Update tailwind.config.js (tokens, fonts)
  2. Install all libraries
  3. Update globals.css (base styles, fonts)
  4. Build cn() utility (clsx + tailwind-merge)
  5. Rebuild: Button, Input, Card, Badge, Modal (Radix), EmptyState
  6. Rebuild: AppShell, AppGuard (branded loader)
  7. Rebuild: TopBar (with month picker + user dropdown)
  8. Rebuild: Sidebar (with icons + active state + mini budget widget)

Dashboard
  9.  SummaryCards (with BudgetArc SVG animation)
  10. CategoryChart (Recharts donut + legend)
  11. TrendChart (Recharts AreaChart — new component)
  12. TransactionItem (the row)
  13. TransactionList (grouped, filtered)
  14. Wire up Dashboard page

Core Flows
  15. TransactionForm (full form in Modal)
  16. VoiceInput (speech API + LLM integration)
  17. Wire up Transactions page + Add Expense page
  18. BudgetCard (with Radix Progress)
  19. BudgetGrid (with month selector)
  20. Wire up Budgets page

Intelligence + Polish
  21. InsightsPanel (with skeleton + tip cards)
  22. Wire up Insights page
  23. Mobile bottom nav
  24. Mobile FAB
  25. Add sonner toasts for all mutations
  26. Add framer-motion page transitions
  27. Test responsive layout at all breakpoints
  28. Audit focus states and keyboard nav
```

---

*UI_PLAN.md — Finance Buddy | Prepared June 2025*
