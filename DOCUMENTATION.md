# Finance Buddy — Full Documentation

A personal finance tracker: expenses, income, budgets, savings, recurring bills, AI-powered
PDF statement import, voice entry, and analytics. Built for a single user on free-tier
infrastructure (Supabase free DB + a free AI provider like Groq).

---

## Table of contents
1. [Overview](#1-overview)
2. [Tech stack](#2-tech-stack)
3. [Project structure](#3-project-structure)
4. [Getting started](#4-getting-started)
5. [Authentication](#5-authentication)
6. [Database schema](#6-database-schema)
7. [Core concepts](#7-core-concepts)
8. [Pages & behavior](#8-pages--behavior)
9. [AI integration](#9-ai-integration)
10. [Statement import — deep dive](#10-statement-import--deep-dive)
11. [Retention & pruning](#11-retention--pruning)
12. [Recurring & bills](#12-recurring--bills)
13. [Savings tracker](#13-savings-tracker)
14. [Theming](#14-theming)
15. [API reference](#15-api-reference)
16. [Background triggers](#16-background-triggers)
17. [SQL files & run order](#17-sql-files--run-order)
18. [Free-tier limits & known caveats](#18-free-tier-limits--known-caveats)

---

## 1. Overview

Finance Buddy is a Next.js (App Router) web app backed by Supabase Postgres. It uses a
**custom session-cookie auth** (not Supabase Auth), a **service-role** DB client with access
control enforced in the API routes (no RLS), and an **OpenAI-compatible AI client** that works
with any provider (Groq, OpenAI, Gemini's OpenAI endpoint, OpenRouter, local Ollama…).

Design goals:
- **Mobile-friendly** with a bottom nav + bottom-sheet "More" menu, and a desktop sidebar.
- **Free to run** — Supabase free tier + a free AI key. To fit the free DB, only the **current +
  previous 2 calendar months** of raw transactions are kept; older months are rolled into
  monthly summaries (see [Retention](#11-retention--pruning)).
- **Accrual accounting** — spend/income is attributed to the date of each transaction
  (`occurred_at`), not when a card bill is paid.

---

## 2. Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack), **React 19**, **TypeScript 5** |
| Styling | **Tailwind CSS 4** (`@import "tailwindcss"`, CSS custom-property tokens) |
| Database | **Supabase** (PostgreSQL) via `@supabase/supabase-js` service-role client |
| Auth | Custom **scrypt** password hashing + `sessions` table + `fb_session` HTTPOnly cookie |
| Charts | **Recharts** |
| Icons | **lucide-react** |
| Dates | **date-fns** |
| Toasts | **sonner** |
| PDF text | **unpdf** (pdf.js under the hood; password-protected PDFs supported) |
| AI | Any **OpenAI-compatible** chat API (default config targets Groq) |
| Fonts | **Fraunces** (display/serif), **Inter** (body), **JetBrains Mono** (numbers) |

Scripts (`package.json`): `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.

---

## 3. Project structure

```
app/
  layout.tsx                 # root layout, fonts, metadata
  icon.svg                   # custom favicon (coral ₹ mark)
  globals.css                # Tailwind import + theme tokens + component classes
  (auth)/                    # unauthenticated routes
    login/page.tsx
    signup/page.tsx
  (app)/                     # authenticated app (wrapped by AppShell via layout)
    dashboard/page.tsx
    transactions/page.tsx
    transactions/new/page.tsx
    budgets/page.tsx
    savings/page.tsx
    recurring/page.tsx
    import/page.tsx
    reports/page.tsx
    insights/page.tsx
    settings/page.tsx
  api/                       # route handlers (see API reference)
    auth/ ai/ budgets/ categories/ transactions/ recurring/
    statements/ sources/ savings/ reports/ maintenance/

components/
  layout/   AppShell, Sidebar, TopBar, MobileNav, Fab, AppGuard,
            PruneOnLoad, RunDueOnLoad
  dashboard/ SummaryCard, DonutChart, TransactionList, UpcomingBills
  transactions/ QuickAddModal
  budgets/  BudgetCard
  savings/  (uses page-level UI)
  recurring/ RecurringCard
  reports/  CashflowChart, TrendChart, CategoryBars, ComparisonCards
  import/   ReviewTable
  ui/       Badge, Modal, EmptyState, Toaster

lib/
  context/   MonthContext, QuickAddContext
  hooks/     useAuth, useSpeechRecognition, useRefreshBus
  server/    auth, spend (categoryExcludesSpend), recurring (postOccurrence)
  ai/        openai (chatJSON, aiConfigured), prompts
  utils/     statements, spend, recurring, categories, csv
  supabase/  server (service-role client)

db/          v2_schema.sql, v3_savings.sql, v4_retention.sql, v5_cron.sql
samples/     sample bank/card PDFs for testing import
scripts/     make-sample-pdfs.mjs (regenerate sample PDFs)
plan/        historical planning docs (not used at runtime)
```

---

## 4. Getting started

### Environment variables (`.env`)
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>     # server only — never expose

# AI (OpenAI-compatible). Example shows Groq (free tier).
AI_API_KEY=gsk_xxx                                # falls back to OPENAI_API_KEY
AI_BASE_URL=https://api.groq.com/openai/v1        # default: https://api.openai.com/v1
AI_MODEL=llama-3.3-70b-versatile                  # default: gpt-4o-mini
```
> AI keys are **server-side only** (no `NEXT_PUBLIC_` prefix). The Supabase service-role key
> bypasses RLS — access control lives entirely in the API routes via `getSessionUser`.

### Install & run
```bash
npm install --legacy-peer-deps   # React 19 vs older Radix peer deps
npm run dev
```

### Database setup (Supabase → SQL Editor)
Run the SQL files **in order** (see [SQL files & run order](#17-sql-files--run-order)):
`v2_schema.sql` → `v3_savings.sql` → `v4_retention.sql` → `v5_cron.sql`.

### Accessing from a phone on your LAN (dev)
`next.config.ts` lists `allowedDevOrigins` (e.g. `192.168.88.*`). Start the server bound to all
interfaces if needed: `npm run dev -- -H 0.0.0.0`, then open `http://<your-ip>:3000`.

---

## 5. Authentication

Custom, no Supabase Auth library:
- Passwords hashed with **scrypt** (`salt:key`), verified with `timingSafeEqual`
  ([lib/server/auth.ts](lib/server/auth.ts)).
- On login/signup a random token is stored in the **`sessions`** table and set as an
  **`fb_session`** HTTPOnly, SameSite=Lax cookie (30-day expiry; `secure` in production).
- `getSessionUser(request)` looks up the token, checks `expires_at`, and returns `{id, email}`.
  Every API route calls it and returns 401 if absent.
- Client state via `useAuth()` ([lib/hooks/useAuth.ts](lib/hooks/useAuth.ts)); `AppGuard`
  protects the `(app)` routes; the session probe runs in the background and never blocks typing
  on the login form.

---

## 6. Database schema

No RLS — the service-role client + per-route `getSessionUser` enforce ownership.

| Table | Key columns |
|---|---|
| `users` | id, email, password_hash |
| `sessions` | id, user_id, token, user_agent, ip, expires_at |
| `categories` | id, user_id, name, color, **icon**, **exclude_from_spend**, **is_savings** |
| `transactions` | id, user_id, amount, currency, type (`expense`/`income`), category_id, merchant, notes, **occurred_at** (date field), created_at, **exclude_from_spend**, source_id, import_id, recurring_id, external_ref |
| `budgets` | id, user_id, name, amount, month (first-of-month date), category_id |
| `savings_goals` | id, user_id, month, amount, updated_at — unique (user_id, month) |
| `recurring_rules` | id, user_id, category_id, type, amount, merchant, notes, frequency, interval, next_due, end_date, is_active, auto_post |
| `statement_sources` | id, user_id, name, kind (`bank`/`credit_card`), cycle_day |
| `statement_imports` | id, user_id, source_id, file_name, period_start/end, parsed_count, imported_count, duplicate_count, status |
| `monthly_summaries` | id, user_id, month, category_id, category_name, type, total, txn_count, exclude_from_spend — unique (user_id, month, type, coalesce(category_id,0-uuid)) |

Notes:
- `transactions.occurred_at` is **the date** used by all analytics (not `created_at`).
- `transactions.notes` is the free-text/description field.

---

## 7. Core concepts

### Accrual by `occurred_at`
Every aggregate (dashboard, budgets, savings, reports, sidebar) filters by the transaction's own
date. A credit-card statement spanning two months is **split** across those months by each
purchase's date. See [the credit-card example](#101-credit-card-billing-cycle--double-count).

### `exclude_from_spend`
Non-consumption outflows — **Transfer to Savings**, **Credit Card Payment**, and the savings
sub-categories — are flagged `exclude_from_spend=true`. They are **excluded from spend totals,
budgets, the category donut, and report cashflow**, but still appear in the raw transaction list.
The flag is computed on the category and **stamped onto each transaction on write**
([lib/server/spend.ts](lib/server/spend.ts)), so every downstream view is consistent.
`isSpend()` / `isIncome()` in [lib/utils/spend.ts](lib/utils/spend.ts) encode the rule.

### Miscellaneous bucket
Uncategorised spend (no `category_id`) is attributed to the seeded **"Miscellaneous"** category
in the dashboard donut and budgets, so it's visible and budgetable.

### Month context
[MonthContext](lib/context/MonthContext.tsx) holds the active month (top-bar picker). Dashboard,
budgets, savings, insights all read it; changing the month updates them together.

### Refresh bus
Instead of a global data store, [useRefreshBus](lib/hooks/useRefreshBus.ts) broadcasts a window
event on any mutation (`emitRefresh()`); pages and the sidebar subscribe (`useRefreshListener`)
and refetch — so totals/badges update live without a page reload.

---

## 8. Pages & behavior

- **Login / Signup** — email + password; redirect to dashboard when authenticated.
- **Dashboard** — active-month summary cards (spent vs budget, income, budget health), spend-by-
  category donut, recent transactions, upcoming bills (due ≤7 days), a compact cashflow card
  (when ≥2 months of data), and budget bars. Skeleton while loading.
- **Transactions** — searchable, filterable list grouped by day. Filters: type, category, and a
  **between-two-dates range** (with clear button). The **Add** button opens the voice-enabled
  quick-add modal. Inline edit/delete.
- **Add transaction** (`/transactions/new`) — full hero form (amount, type, merchant, category,
  date, notes). The sidebar "Add expense" links here.
- **Budgets** — per-category monthly limits with progress bars. **Copy from…** clones a previous
  month's budgets into the active month, skipping categories already budgeted (idempotent).
- **Savings** — monthly savings goal vs actual (sum of transactions in savings categories),
  breakdown by bucket (Transfer to Savings, SIP, Stocks, Savings Account), recent savings txns,
  set/edit goal. See [Savings tracker](#13-savings-tracker).
- **Recurring** — recurring income/expense rules with reminders and optional auto-post. See
  [Recurring & bills](#12-recurring--bills).
- **Import** — upload bank/credit-card PDF statements, AI-parse, review, and commit. See
  [Statement import](#10-statement-import--deep-dive).
- **Reports** — cashflow (income/spend bars + savings line), daily-spend trend, category bars,
  this-vs-last comparison, CSV export. Merges `monthly_summaries` (old months) + raw (recent).
- **Insights** — AI-generated spending summary + tips for the active month (needs an AI key).
- **Settings** — category management + sign out.

Navigation: desktop **Sidebar** (with a live monthly-budget widget + due-bills badge); mobile
**bottom nav** (Home, Transactions, Add, Recurring) + a **More** bottom-sheet (Budgets, Savings,
Import, Reports, Insights, Settings). A desktop **FAB** opens quick-add.

---

## 9. AI integration

Provider-agnostic client in [lib/ai/openai.ts](lib/ai/openai.ts):
- `aiConfig()` reads `AI_API_KEY` (or `OPENAI_API_KEY`), `AI_BASE_URL`, `AI_MODEL`.
- `aiConfigured()` — true when a real key is set (routes return **503** otherwise).
- `chatJSON(system, user, maxTokens)` — POSTs to `${baseUrl}/chat/completions` with
  `response_format: json_object`, temperature 0.1; parses JSON even if wrapped in code fences;
  **retries 429/5xx** honoring the `Retry-After` header.

Prompts in [lib/ai/prompts.ts](lib/ai/prompts.ts):
- `voiceTransactionPrompt` — turns a spoken sentence into one transaction (resolves "yesterday").
- `statementParserPrompt` — parses a statement into a **compact** JSON shape.

### Voice transaction entry
[useSpeechRecognition](lib/hooks/useSpeechRecognition.ts) wraps the browser **Web Speech API**
(free, on-device; best on Android Chrome). Flow: mic → transcript → `POST /api/ai/parse-transaction`
→ fields pre-filled in the quick-add modal for review → save via the normal transactions endpoint.
The mic is hidden where the API is unsupported; the route degrades to 503 without an AI key.

---

## 10. Statement import — deep dive

Pipeline ([app/api/statements/upload/route.ts](app/api/statements/upload/route.ts)):

1. **Extract** — `unpdf` extracts text (password-protected PDFs supported). Scanned/image PDFs
   are rejected (no OCR).
2. **Massage** — `massageStatementText()` keeps only transaction-like lines (date or amount),
   strips long reference/ID tokens (UPI/IMPS refs), and collapses whitespace — cutting input
   tokens. Falls back to the cleaned original if filtering removes too much.
3. **Token-aware parse** — the text is chunked only as needed so each request stays under the
   provider's tokens-per-minute budget; `max_tokens` is right-sized per request. A small
   statement is one call.
4. **Compact output** — the model returns short keys `{ps,pe,tx:[{d,a,t,m,c,p}]}` to minimize
   output tokens; `expandCompactRow()` converts them back to full fields.
5. **Tag & guard** — each row is categorised, the **billing-cycle/period guard** marks rows in
   the still-open period as **blocked**, and **duplicates** (amount + date ±3d + merchant
   similarity) are flagged.
6. **Review** — the [ReviewTable](components/import/ReviewTable.tsx) lets you select rows, override
   categories; duplicates are pre-unchecked, blocked rows greyed out.
7. **Commit** — `/api/statements/[id]/commit` re-applies the period guard server-side and inserts
   the selected rows.

### 10.1 Credit-card billing cycle & double-count

A `credit_card` source has a **`cycle_day`** = the day each new cycle begins. The guard
(`openPeriodStart` / `isRowBlocked` in [lib/utils/statements.ts](lib/utils/statements.ts)) blocks
rows on/after the most recent `cycle_day` (the current, unbilled cycle); earlier rows
(closed cycles) are importable. For a 16th→15th cycle, set **`cycle_day = 16`**.

**Double-count avoidance:** when a bank statement shows a credit-card **bill payment**, the AI tags
it (`is_card_payment`), and the route assigns the **Credit Card Payment** category +
`exclude_from_spend=true` — so the lump-sum payment is **not** counted as spend. The card's
individual purchases (from the card statement) are counted normally. Net: spend is counted once.

**Which month?** Purchases count in the month of **each purchase date** (accrual); the bill
payment counts in **no** analytics (only the raw list). Example — a 16 Apr–15 May statement paid
25 May: 16–30 Apr purchases → April; 1–15 May purchases → May; the 25 May payment → list only.

---

## 11. Retention & pruning

To stay within the free DB, only **current + previous 2 calendar months** of raw transactions are
kept. Older transactions are **rolled up** into `monthly_summaries` (per month/category/type
totals) and the raw rows deleted.

- DB function `prune_old_transactions(p_user_id default null)` — cutoff = first day of
  `(this month − 2 months)`. June → cutoff **April 1**, so March & older are summarized + deleted.
  Rollup is additive (ON CONFLICT), raw deleted after; returns the count pruned.
- **Reports** merge summaries (pruned months) + raw (recent), preferring raw per month — so
  history stays visible after pruning. Other tabs use raw only.
- **Triggers:** ([Background triggers](#16-background-triggers))
  - Client `PruneOnLoad` posts `/api/maintenance/prune` at most once/day per browser.
  - Server `pg_cron` job `fb-prune` runs `prune_old_transactions()` for all users at **01:00 IST
    every 2 days** (cron `30 19 */2 * *` in UTC) — independent of app usage.

**Importing an old month** (e.g. March now): not blocked (only the current open period is). It
imports into raw, then the next prune rolls it into summaries and deletes the raw rows → visible
in Reports, gone from the txn list. ⚠️ Dedup only checks **raw** rows, so re-importing an
already-pruned month double-counts in summaries.

---

## 12. Recurring & bills

Rules ([app/(app)/recurring/page.tsx](app/(app)/recurring/page.tsx), `recurring_rules` table) have
type/amount/category/frequency/interval/next_due/end_date/auto_post. Helpers in
[lib/utils/recurring.ts](lib/utils/recurring.ts) (advance date, status, due-within). Server
`postOccurrence()` ([lib/server/recurring.ts](lib/server/recurring.ts)) inserts a transaction for
`next_due` and advances it. `RunDueOnLoad` auto-posts due `auto_post` rules once per session.
The dashboard shows bills due within 7 days; the sidebar shows a due-count badge.

**Salary tip:** model a salary as a monthly recurring **income** rule with auto-post on your pay
date; it lands in that month's income (always in-month since paid on/before the 26th).

---

## 13. Savings tracker

- Categories flagged `is_savings=true` (Transfer to Savings, Invest in Stocks, SIP, Savings
  Account) — all also `exclude_from_spend=true`.
- `savings_goals` stores one **overall monthly goal** per month (`/api/savings` GET/POST upsert).
- The page sums active-month transactions in savings categories = **actual saved**, shows a
  progress bar vs goal, a per-bucket breakdown, and recent savings transactions.
- To record savings, add a transaction with a savings category — it flows into the tracker (and
  is excluded from spend/budgets).

---

## 14. Theming

"Warm Sand" light theme via CSS custom properties in [app/globals.css](app/globals.css) and
mirrored tokens in `tailwind.config.ts`:
- Surfaces: cream `#FAF6F0` canvas, white cards, `#F4EDE3` raised, `#EAE0D2` borders.
- Brand (CTA/coral): `--brand #E5533D`; **Positive** (income/teal): `--positive #0E9888`;
  warning `#D97706`, danger `#DC2626`.
- Headings use Fraunces (serif). Recharts SVG fills use **literal hex** (CSS vars don't resolve in
  SVG). Component classes: `.fb-card`, `.fb-btn`, `.fb-input`, `.fb-progress-*`, `.fb-skeleton`,
  `.pb-safe` (safe-area), coral `:focus-visible` outlines.

---

## 15. API reference

All routes require a valid `fb_session` (401 otherwise). AI routes return 503 without a key.

| Method & path | Purpose |
|---|---|
| `POST /api/auth/signup` · `login` · `logout` · `GET /api/auth/session` | Auth |
| `GET/POST /api/transactions` · `PATCH/DELETE /api/transactions/[id]` | Transactions (POST stamps `exclude_from_spend`) |
| `GET/POST /api/categories` · `PATCH/DELETE /api/categories/[id]` | Categories (seeds defaults on first GET) |
| `GET/POST /api/budgets` · `PATCH/DELETE /api/budgets/[id]` · `POST /api/budgets/copy` | Budgets + copy-month |
| `GET/POST /api/savings` | Savings goal (GET by `?month=`, POST upsert) |
| `GET/POST /api/recurring` · `PATCH/DELETE /api/recurring/[id]` · `POST /api/recurring/[id]/post` · `POST /api/recurring/run-due` | Recurring rules |
| `GET/POST /api/sources` · `PATCH/DELETE /api/sources/[id]` | Statement sources |
| `POST /api/statements/upload` · `GET /api/statements` · `GET/DELETE /api/statements/[id]` · `POST /api/statements/[id]/commit` | Statement import |
| `GET /api/reports` | Merged monthly report data |
| `POST /api/ai/insights` · `POST /api/ai/parse-transaction` | AI insights / voice parse |
| `POST /api/maintenance/prune` | Run retention for the current user (returns `{pruned}`) |

---

## 16. Background triggers

Mounted once in [AppShell](components/layout/AppShell.tsx):
- **PruneOnLoad** — daily-throttled (localStorage `fb_last_prune_v2`) call to the prune endpoint.
- **RunDueOnLoad** — once/session (sessionStorage), posts due auto-post recurring rules.
- **pg_cron `fb-prune`** (server, from `v5_cron.sql`) — authoritative scheduled pruning.

---

## 17. SQL files & run order

Run in the Supabase SQL editor, in order. All are idempotent / safe to re-run.

1. **`db/v2_schema.sql`** — adds `categories.exclude_from_spend`/`icon`; creates
   `statement_sources`, `statement_imports`, `recurring_rules`, `monthly_summaries`; adds
   transaction columns + dedup index; defines `prune_old_transactions()`; seeds Transfer to
   Savings + Credit Card Payment.
2. **`db/v3_savings.sql`** — adds `categories.is_savings`; creates `savings_goals`; marks Transfer
   to Savings as savings; seeds Invest in Stocks / SIP / Savings Account + Miscellaneous.
3. **`db/v4_retention.sql`** — updates `prune_old_transactions()` to keep current + previous 2
   months (returns pruned count). *(v2 also contains the updated definition for fresh installs.)*
4. **`db/v5_cron.sql`** — enables `pg_cron` and schedules `fb-prune` (01:00 IST every 2 days).

The base tables (`users`, `sessions`, `transactions`, `budgets`, `categories`) predate these files
and are assumed to already exist.

---

## 18. Free-tier limits & known caveats

- **AI tokens-per-minute** (e.g. Groq free = 12k TPM) cap a single statement import to roughly
  **150–200 transactions** (after compact output + input massaging). Bigger statements: split the
  PDF, switch `AI_MODEL`, or upgrade the AI tier.
- **No OCR** — scanned/image-only PDFs aren't supported.
- **Web Speech API** voice entry is best on Android Chrome; iOS Safari can be flaky (a Groq Whisper
  fallback could be added).
- **Re-importing a pruned month** double-counts in `monthly_summaries` (dedup can't see summaries).
- **`cycle_day`** is the cycle **start** day; for a 16th→15th cycle set 16 (not 15).
- **Pruned months** appear only in **Reports** (via summaries); raw-only tabs (dashboard,
  transactions, budgets, savings) show nothing for those months.
