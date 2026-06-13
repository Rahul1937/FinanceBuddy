# V2_REVAMP_PLAN.md — Finance Buddy (Tracker + Statement Import)

> Evolve the expense tracker into a smarter personal-finance app: a fresh **Warm Sand (light)** theme,
> **PDF statement import** (bank + credit-card) with AI parsing, duplicate-proofing and correct
> credit-card handling, plus **Recurring & Bills** and a real **Analytics & Reports** section.
> Mobile-first throughout.

**Decisions (locked):**
- **Theme:** Warm Sand · Light — cream canvas, coral primary accent, teal for positive money, warm serif headings.
- **New features:** **Statement Import (PDF + AI)** · **Recurring & Bills** · **Analytics & Reports**.
- **Removed:** Wallets / Accounts / Transfers / net-worth. Replaced by a simple **"Transfer to Savings"** expense category (and a **"Credit Card Payment"** category) that are *excluded from spending totals*.
- **Database:** new Supabase tables required — full SQL lives in [`db/v2_schema.sql`](../db/v2_schema.sql); you run it once. App code + API routes are mine.
- **Retention (Supabase free tier):** only the **current + previous calendar month** of *raw* transactions are kept. Older months are rolled up into a tiny `monthly_summaries` table and the raw rows are deleted by the `prune_old_transactions()` function (called by the app on load, per-user; optionally via pg_cron). Reports/Insights read summaries for older months + raw rows for the recent two. Statement import therefore targets the **previous month** (the closed month still in the retention window).
- **Libraries:** free/open-source only (see §2).

> **Assumption to confirm:** statement import needs a lightweight **"statement source"** (a named bank/card
> with an optional billing-cycle day) so it can handle credit-card cycles and the CC-payment dedup. This is
> *not* a wallet — no balances, no transfers. If you'd rather pick "bank / credit card" fresh on every upload
> instead of keeping a small saved list, say so and I'll drop the table.

---

## 0. Current State (baseline)

- Next.js 16 · React 19 · Tailwind 4 · Supabase · custom session auth (`fb_session`).
- Theme is **dark emerald**, driven mostly by CSS variables in `app/globals.css` + tokens in `tailwind.config.ts`.
- Pages: `/dashboard`, `/transactions`, `/transactions/new`, `/budgets`, `/insights`, `/settings`, auth, landing.
- Data is fetched **per page, client-side**, then filtered by month in JS (`MonthContext`).
- DB tables: `users`, `sessions`, `transactions`, `budgets`, `categories`.
  - `transactions`: id, user_id, amount, currency, type, category_id, merchant, notes, occurred_at, created_at
  - `budgets`: id, user_id, name, amount, month, category_id
  - `categories`: id, user_id, name, color

**Key leverage point:** components reference CSS custom properties (`--surface-*`, `--brand`, …), so re-defining
those variables flips most of the theme automatically. The remaining work is hunting hardcoded hex literals
(`#0D1424` in Sidebar/MobileNav, emerald `rgba(16,185,129,…)`, chart fallback `#818cf8`).

---

## 1. Theme — Warm Sand (Light)

### 1.1 Design tokens (rewrite `:root` in `app/globals.css` + mirror in `tailwind.config.ts`)

```
CANVAS / SURFACES
  --surface-base    #FAF6F0   warm cream page background
  --surface-card    #FFFFFF   cards, sidebar, modals
  --surface-raised  #F4EDE3   inner panels, hover, inputs
  --surface-border  #EAE0D2   dividers, card borders

ACCENT (coral = primary / CTA / active)
  --brand           #E5533D   buttons, active nav, focus ring, links
  --brand-dim       #C8472F   hover/pressed
  --brand-soft      #FCE9E4   tinted backgrounds (active nav pill, chips)

MONEY SEMANTICS
  --positive        #0E9888   income, on-budget, savings           (teal)
  --positive-soft   #DBF1ED
  --negative        #E5533D   expense emphasis, over-budget         (coral)
  --warning         #D97706   approaching limit (>80%)              (amber)
  --danger          #DC2626   destructive / hard over-budget        (red)

TEXT
  --text-primary    #1C1A17   headings, amounts
  --text-secondary  #5E574D   body
  --text-muted      #9A9082   labels, meta, placeholders

SHADOWS (light theme — soft warm shadows, not dark glow)
  --shadow-card     0 1px 2px rgba(28,26,23,.04), 0 8px 24px -12px rgba(28,26,23,.12)
```

> **Semantics change:** today `--brand` (emerald) means *both* CTA and income. In the warm theme coral reads
> as "alert", so we split: **`--brand` = CTA/coral**, **`--positive` = income/teal**. Every place that used
> `--brand` for *income/positive money* switches to `--positive` (e.g. `.fb-tx-amount.income`, income
> SummaryCard, on-budget bars). CTA/nav/active stays `--brand`.

### 1.2 Typography
- **Display / headings:** `Fraunces` (variable warm serif — free Google font) → premium editorial feel on cream.
- **Body:** keep `Inter`. **Mono (amounts):** keep `JetBrains Mono`, `tabular-nums`.
- Wire `Fraunces` via `next/font/google` in `app/layout.tsx` as `--font-display` (replaces Plus Jakarta Sans).

### 1.3 Theme migration checklist
1. Replace `:root` tokens in `globals.css` + add `--shadow-card`, `--positive*`, `--brand-soft`.
2. Update `tailwind.config.ts` `colors` (surface, brand, add `positive`, `warning`, `danger`).
3. Swap display font in `layout.tsx`; set body bg to `--surface-base`.
4. Grep & replace hardcoded literals: `#0D1424` → `var(--surface-card)`; emerald `rgba(16,185,129,…)` → `--brand-soft`/`--positive-soft`; `#818cf8` → category color/`--brand`.
5. Re-tune `.fb-*` classes + `components/ui/*` (Button, Card, Badge, Input, Modal, EmptyState) for light: visible borders, soft shadow, coral `::selection`.
6. Contrast audit on every page (muted text on cream ≥ 4.5:1).

**Deliverable:** the existing app, fully working, in the new light theme.

---

## 2. Libraries (all free / MIT)

Already installed: `recharts`, `lucide-react`, `date-fns`, `@radix-ui/*`, `clsx`, `tailwind-merge`. OpenAI for AI.

**Add:**
| Library | Use | Note |
|---|---|---|
| `unpdf` | Extract text from PDF statements (serverless-friendly) | MIT; supports password-protected PDFs. Alt: `pdf-parse` |
| `sonner` | Toasts on every create/update/delete/import | MIT, tiny |
| `@radix-ui/react-tabs` | Tabs on Reports & Import review | MIT, accessible |
| `Fraunces` (next/font) | Serif headings | Google Fonts, free |

**Optional / later:** `tesseract.js` for OCR of *scanned* (image-only) PDFs — free but heavy; Phase 2.
**Not adding:** CSV libs (hand-rolled exporter), any paid OCR/parsing SaaS.

---

## 3. Database — new tables & columns (SQL to run in Supabase)

> **The authoritative, runnable script is [`db/v2_schema.sql`](../db/v2_schema.sql)** — run it once in the
> Supabase SQL editor (idempotent, safe to re-run). It adds: `categories.exclude_from_spend`/`icon`,
> `statement_sources`, `statement_imports`, the new `transactions` columns, `recurring_rules`,
> `monthly_summaries`, the `prune_old_transactions()` retention function, and seeds the two non-spend
> categories. `gen_random_uuid()` = pgcrypto (enabled on Supabase); **no RLS** (auth enforced in API routes).
> The snippets below are reference only — `db/v2_schema.sql` is the source of truth.

```sql
-- 3.1 Mark categories that are NOT real consumption (excluded from spend analytics & budgets)
alter table categories add column if not exists exclude_from_spend boolean not null default false;
alter table categories add column if not exists icon text;  -- optional: store icon instead of name-mapping

-- 3.2 STATEMENT SOURCES  (import metadata only — NOT a wallet; no balances/transfers)
create table if not exists statement_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,                 -- "HDFC Savings", "ICICI Amazon Card"
  kind        text not null default 'bank',  -- bank | credit_card
  cycle_day   int,                           -- credit_card: statement close day (e.g. 15); null for bank
  created_at  timestamptz not null default now()
);
create index if not exists idx_sources_user on statement_sources(user_id);

-- 3.3 STATEMENT IMPORTS  (audit row per uploaded file)
create table if not exists statement_imports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users(id) on delete cascade,
  source_id       uuid references statement_sources(id) on delete set null,
  file_name       text,
  period_start    date,
  period_end      date,
  parsed_count    int  not null default 0,
  imported_count  int  not null default 0,
  duplicate_count int  not null default 0,
  status          text not null default 'review', -- review | done | failed
  created_at      timestamptz not null default now()
);
create index if not exists idx_imports_user on statement_imports(user_id);

-- 3.4 Extend transactions for import + non-spend flagging + dedup
alter table transactions add column if not exists source_id uuid references statement_sources(id) on delete set null;
alter table transactions add column if not exists import_id uuid references statement_imports(id) on delete set null;
alter table transactions add column if not exists exclude_from_spend boolean not null default false; -- cc payment / savings transfer
alter table transactions add column if not exists external_ref text;  -- bank ref no. / dedup hash if available
create index if not exists idx_tx_dedup on transactions(user_id, occurred_at, amount);

-- 3.5 Seed the two non-spend categories (run once; adjust user_id or do per-user in app on first load)
--   "Transfer to Savings"   exclude_from_spend = true
--   "Credit Card Payment"   exclude_from_spend = true
-- (Seeding is handled in app code alongside the existing default-category seeding.)
```

**Non-spend categories:** `exclude_from_spend = true` means the transaction is an *outflow that isn't
consumption* (moving money to savings, paying a card bill). These are **excluded from "spending by category",
budgets, and "total spent"**, but still appear in cashflow/transaction lists. This is what makes the
credit-card scenario add up correctly (see §5).

---

## 4. Architecture — shared DataProvider (foundational)

Today every page (and the Sidebar) independently `fetch`es its data — the cause of the "sidebar stats don't
update" bug, and it'll get worse with imports + recurring. Introduce **`lib/context/DataProvider.tsx`**,
mounted in `AppShell` (inside `MonthProvider`):
- Loads once: `transactions`, `categories`, `budgets`, `recurring_rules`, `statement_sources`, `statement_imports`.
- Exposes `{ ...data, loading, refresh() }` + selectors: `byMonth(monthStr)`, `spendTotal` (excludes `exclude_from_spend`), `savingsTotal`, `upcomingBills`.
- Every mutation (add txn, import commit, post recurring, edit budget) calls `refresh()` → all UI updates live.
- Replaces the Sidebar's separate fetch and per-page `useEffect` fetches.

Build it early (Phase B) — it's the backbone for B–D.

---

## 5. Statement Import — detailed design (the centerpiece)

### 5.1 Flow
```
Upload page → pick/create Source (bank or card) → choose PDF (+ password if protected)
   → POST /api/statements/upload
        • unpdf extracts text  (scanned/image PDF with no text → fail with a clear message; OCR is Phase 2)
        • AI parses text → { period_start, period_end, transactions[] }
        • server runs: previous-period guard  +  duplicate detection  +  CC-payment tagging
        • creates a statement_imports row (status=review) and returns a REVIEW payload
   → Review page: table of parsed rows (dup rows pre-unchecked & flagged, category editable, exclude toggle)
   → POST /api/statements/[id]/commit → inserts only the checked, non-duplicate rows
```

### 5.2 AI parsing
- `lib/ai/prompts.ts`: add a **statement-parser** prompt. Input = extracted text + `source.kind`.
  Output = strict JSON:
  ```json
  {
    "period_start": "2026-04-15", "period_end": "2026-05-14",
    "transactions": [
      { "date":"2026-04-18", "amount":1299, "type":"expense",
        "merchant":"Amazon", "description":"Amazon order",
        "category_suggestion":"Shopping", "is_card_payment":false }
    ]
  }
  ```
- For **bank** statements the prompt asks the model to set `is_card_payment:true` on lines that are credit-card
  bill payments (keywords: "credit card payment", "card payment", "autopay", "neft … card", card brand names)
  and `category_suggestion:"Transfer to Savings"` on transfers to a savings/RD/MF account.
- For **credit_card** statements every purchase is an `expense`; bill-payment *credits* (your payment showing on
  the card statement) are flagged so they're not counted as income/spend.
- Long statements are chunked; results merged. Amounts normalized (₹, commas, Dr/Cr → type).

### 5.3 Duplicate detection (so re-uploading never double-adds)
For each parsed row, search existing transactions for the same user where:
`amount == row.amount` **AND** `abs(occurred_at − row.date) ≤ 3 days` **AND** normalized-merchant similarity is high
(lowercased, punctuation-stripped, token overlap). Match ⇒ mark `duplicate` (pre-unchecked in review).
Also dedup within the file and against prior imports (via `external_ref` when the bank provides a reference no.).
The `idx_tx_dedup(user_id, occurred_at, amount)` index keeps this fast.

### 5.4 Previous-months / closed-cycle guard (no current ongoing period)
- **Bank source:** reject any parsed row dated in the **current calendar month**. You can import closed months only.
- **Credit-card source (cycle_day D):** compute the **last close date** = most recent day-`D` ≤ today; reject rows
  dated **on/after** it (they belong to the still-open cycle). E.g. D=15, today Jun 13 → last close = May 15 →
  allowed rows are before May 15; May 15–Jun 13 is the open cycle and is blocked.
- Blocked rows are shown greyed in review with a reason; they cannot be imported.

### 5.5 Credit-card double-count handling (the key scenario)
Money paid to a card appears in **two** statements; we must not count it twice:
- **Bank statement** line "Credit Card Payment ₹25,000" → category **"Credit Card Payment"**, `exclude_from_spend=true`.
  It's a settlement, **not** consumption → excluded from spend/budgets.
- **Credit-card statement** individual purchases (totaling ₹25,000) → real `expense`s → **counted**.
- Result: bank payment (excluded) + card purchases (counted) = correct ₹25,000 of actual spending. ✔
- Helpful nudge: if a bank import contains a card payment but no matching card statement has been imported for
  that period, show "Card payment detected — upload your card statement to see what it was spent on."
- Same mechanism for **"Transfer to Savings"**: excluded from spend, but visible in cashflow and counted as savings.

### 5.6 Endpoints, pages, components
```
API   app/api/statements/upload/route.ts          POST (multipart: file, source_id|new source, password?)
      app/api/statements/[id]/route.ts             GET (review payload) · DELETE (discard import)
      app/api/statements/[id]/commit/route.ts      POST (selected rows → transactions)
      app/api/sources/route.ts  + sources/[id]/route.ts   CRUD for statement_sources
Page  app/(app)/import/page.tsx                    upload + past-imports list + source manager
      app/(app)/import/[id]/review/page.tsx         review & confirm parsed rows
Comp  components/import/UploadCard.tsx  SourcePicker.tsx  ReviewTable.tsx  ImportRow.tsx  ImportHistory.tsx
Lib   lib/utils/statements.ts   (dedup signature, cycle math, period guards)
      lib/ai/prompts.ts         (statement-parser prompt)
```

---

## 6. Phased Roadmap

### Phase A — Theme & foundation  *(no DB; ship first)*
- Rewrite tokens (`globals.css` + `tailwind.config.ts`), add `Fraunces`, replace dark literals, re-tune `.fb-*` + `ui/*` for light, add `sonner` `<Toaster/>` + `toast` helper, contrast pass on all pages.

### Phase B — Statement Import + non-spend categories
- Run SQL §3.1–3.4. Seed "Transfer to Savings" + "Credit Card Payment" categories (`exclude_from_spend`).
- `lib/context/DataProvider.tsx` (§4). `lib/utils/statements.ts` (dedup, cycle math, guards).
- `lib/ai/prompts.ts` statement-parser prompt; `lib/ai/openai.ts` call wrapper if needed.
- API: `statements/upload`, `statements/[id]`, `statements/[id]/commit`, `sources` CRUD.
- Pages/components per §5.6 (upload, review table, import history, source manager).
- Make **spend/budget/category analytics everywhere exclude `exclude_from_spend`** transactions.
- Add a **Transaction → category** picker that surfaces the new non-spend categories.
- Nav: add **Import** item (Sidebar + mobile "More").

### Phase C — Recurring & Bills
- SQL: `recurring_rules` (no account ref) + `recurring_id` on transactions.
  ```sql
  create table if not exists recurring_rules (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,
    category_id uuid references categories(id) on delete set null,
    type text not null default 'expense', amount numeric(14,2) not null,
    merchant text, notes text,
    frequency text not null default 'monthly', interval int not null default 1,
    next_due date not null, end_date date,
    is_active boolean not null default true, auto_post boolean not null default false,
    created_at timestamptz not null default now()
  );
  alter table transactions add column if not exists recurring_id uuid references recurring_rules(id) on delete set null;
  ```
- `lib/utils/recurring.ts` (`nextDue`, `advance`, `dueWithin`). API: `recurring` CRUD + `recurring/[id]/post`.
- Page `/recurring`: Upcoming (next 30 days) + All rules; each card → amount, frequency, category, next-due, **Post now**, edit, pause.
- Dashboard **Upcoming bills** widget (next 7 days) + due/overdue badge in nav.
- Optional: "convert this transaction to recurring".

### Phase D — Analytics & Reports
- Page `/reports` (Radix Tabs: **Overview · Cashflow · Categories · Savings**).
- `CashflowChart` (income vs *consumption* spend per month, last 6–12 mo) — excludes non-spend outflows.
- `TrendChart` (daily spend area for active month) — the long-missing component.
- `CategoryTrend` (top categories + month-over-month).
- `SavingsCard`/trend: savings = income − consumption-spend; "Transfer to Savings" counted as saved, not spent.
- `ComparisonCards` (this vs last month: spend, income, savings rate, top category).
- `lib/utils/csv.ts` + **Export CSV** (hand-rolled). Embed a compact cashflow chart on the dashboard.
- *(Net-worth chart is dropped — without account balances it isn't computable; savings trend replaces it.)*

### Phase E — Mobile & polish
- Rework `MobileNav`: Home · Transactions · **＋Add** · Reports · **More** sheet (Import, Recurring, Budgets, Insights, Settings).
- Global **FAB** quick-add (transaction modal from any page). Convert "Add expense" to a reusable modal (keep `/transactions/new` route).
- Loading skeletons + empty states (import, recurring, reports). `sonner` toasts on all mutations via `DataProvider.refresh()`.
- Responsive QA at 360/640/768/1024/1280; safe-area padding for bottom nav/FAB. Coral focus-visible rings; keyboard-nav audit.

---

## 7. New file map (additions)
```
app/(app)/  import/page.tsx  import/[id]/review/page.tsx  recurring/page.tsx  reports/page.tsx
app/api/    statements/upload/route.ts  statements/[id]/route.ts  statements/[id]/commit/route.ts
            sources/route.ts  sources/[id]/route.ts
            recurring/route.ts  recurring/[id]/route.ts  recurring/[id]/post/route.ts
components/ import/    UploadCard.tsx SourcePicker.tsx ReviewTable.tsx ImportRow.tsx ImportHistory.tsx
            recurring/ RecurringCard.tsx RecurringForm.tsx UpcomingBills.tsx
            reports/   CashflowChart.tsx TrendChart.tsx CategoryTrend.tsx SavingsCard.tsx ComparisonCards.tsx
            layout/    MoreSheet.tsx Fab.tsx        ui/ Toaster.tsx Tabs.tsx
lib/        context/ DataProvider.tsx     utils/ statements.ts recurring.ts csv.ts     ai/ prompts.ts (extend)
```

---

## 8. Risks / decisions to watch
- **Statement sources vs "no wallets":** sources are import-only metadata (name/kind/cycle day), not wallets. Confirm you want the small saved list vs picking type per upload (see top assumption).
- **Scanned/image PDFs:** `unpdf` reads text-based PDFs only. Image-only statements need OCR (`tesseract.js`, Phase 2) — until then, fail with a clear message.
- **Password-protected PDFs:** common for bank/CC statements — accept an optional password on upload and unlock before parsing.
- **AI parsing accuracy:** never auto-commit. The **review screen is mandatory** — user verifies amounts/categories/dups before anything is saved. Keep AI temperature low; validate JSON shape server-side.
- **Token semantics split** (`--brand` vs `--positive`): mechanical but touches many files — do carefully in Phase A.
- **`exclude_from_spend` everywhere:** every spend/budget/category aggregation must filter it out, or the CC/savings logic silently breaks. Centralize via `DataProvider` selectors.
- **Privacy/cost:** statement text goes to OpenAI — send only extracted transaction lines, truncate noise, and keep `OPENAI_API_KEY` server-side (already the pattern). Don't persist the raw PDF (parse in memory).

---

## 9. Suggested execution order
`A (theme) → B (statement import) → C (recurring) → D (reports) → E (mobile/polish)`

Each phase is independently shippable and leaves the app fully working. Start **Phase A** now (no DB dependency);
pause for you to run the Phase B SQL before B begins.

*V2_REVAMP_PLAN.md — updated 2026-06-13*
