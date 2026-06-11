# PLAN.md — Finance Buddy

> Personal Finance Tracker with AI-Powered Insights, Voice Input, and Multi-Device Sync

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack Justification](#3-tech-stack-justification)
4. [Database Design](#4-database-design)
5. [API Design](#5-api-design)
6. [Feature Breakdown](#6-feature-breakdown)
7. [AI/LLM Integration](#7-aillm-integration)
8. [Voice Input Flow](#8-voice-input-flow)
9. [UI/UX Plan](#9-uiux-plan)
10. [Development Roadmap](#10-development-roadmap)
11. [Folder Structure](#11-folder-structure)
12. [Deployment Plan](#12-deployment-plan)
13. [Security Considerations](#13-security-considerations)
14. [Future Enhancements](#14-future-enhancements)

---

## 1. Project Overview

**Finance Buddy** is a personal finance web application designed for individuals who want to take control of their spending without the overhead of complex financial software.

**Core purpose:**
- Track daily expenses — manually, via voice, or by uploading bank statements
- Set and monitor monthly category-wise budgets
- Visualize spending patterns through dashboards and analytics
- Get AI-generated categorization and actionable insights

**Target user:** A solo individual managing personal finances on both laptop and mobile browser.

**Design philosophy:** Simplicity first. Leverage managed services (Supabase, Vercel) to eliminate infrastructure overhead and stay within free-tier limits as long as possible.

---

## 2. System Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        CLIENT                            │
│         Next.js App (Vercel)                             │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────────┐  │
│  │   Dashboard  │  │  Transactions │  │   Budgets    │  │
│  └──────┬───────┘  └──────┬────────┘  └──────┬───────┘  │
│         └─────────────────┼───────────────────┘          │
│                     ┌─────▼──────┐                        │
│                     │  API Layer │                        │
│                     │ (Next.js   │                        │
│                     │  Routes or │                        │
│                     │  Node.js)  │                        │
│                     └─────┬──────┘                        │
└───────────────────────────┼──────────────────────────────┘
                            │
          ┌─────────────────┼──────────────────┐
          │                 │                  │
   ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼───────┐
   │  Supabase   │  │  AI/LLM API  │  │  Browser      │
   │  (Postgres  │  │  (Grok/OpenAI│  │  Speech API   │
   │   + Auth    │  │   REST API)  │  │  (client-side)│
   │   + RLS)    │  └──────────────┘  └───────────────┘
   └─────────────┘
```

### Component Breakdown

**Frontend (Next.js on Vercel)**
- All UI pages and components
- Client-side speech recognition via Browser Speech API
- Supabase JS client for auth + real-time data
- API calls to LLM for insights and categorization

**Backend (Next.js API Routes — default; Node.js on Render if needed)**
- Thin API layer: LLM proxy, statement parsing (Phase 3), sensitive business logic
- Keeps AI API keys off the client

**Database (Supabase — PostgreSQL)**
- Stores users, transactions, budgets, categories
- Row-Level Security (RLS) ensures users only access their own data
- Real-time subscriptions enable multi-device sync

**AI Layer (Grok / OpenAI)**
- Transaction parsing from voice/text
- Auto-categorization
- Monthly spending insights generation

---

## 3. Tech Stack Justification

| Technology | Choice | Why |
|---|---|---|
| **Frontend** | Next.js (React) | SSR/SSG flexibility, API routes built-in, Vercel-native, great DX |
| **Styling** | Tailwind CSS | Fast utility-first styling, no context switching, small bundle |
| **Database** | Supabase (PostgreSQL) | Free tier, built-in auth, real-time, RLS, no backend needed for CRUD |
| **Auth** | Supabase Auth | Handles email/password + OAuth out of the box, JWT-based, secure |
| **Backend** | Next.js API Routes | Avoids separate server for MVP; Node.js/Render added only if needed |
| **AI/LLM** | Grok (xAI) or OpenAI | Structured output support, affordable API pricing, good at parsing tasks |
| **Voice** | Browser Speech API | Zero cost, no third-party dependency, works on Chrome/Safari |
| **Hosting** | Vercel | Free tier, git-push deploys, edge functions, native Next.js support |
| **Charts** | Recharts or Chart.js | Lightweight, React-friendly, free |

**Key principle:** Maximize Supabase to eliminate a standalone backend for Phases 1–2. Introduce Node.js on Render only when PDF parsing or complex server-side logic is needed.

---

## 4. Database Design

### Tables

#### `users` (managed by Supabase Auth)
Supabase auto-creates `auth.users`. Extend with a `profiles` table:

```sql
profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  currency    TEXT DEFAULT 'INR',
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

---

#### `categories`

```sql
categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- e.g. "Food", "Transport"
  icon        TEXT,                       -- emoji or icon name
  color       TEXT,                       -- hex color for charts
  is_default  BOOLEAN DEFAULT FALSE,      -- system-seeded defaults
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

---

#### `budgets`

```sql
budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id  UUID REFERENCES categories(id) ON DELETE CASCADE,
  month        DATE NOT NULL,             -- store as first day of month: 2025-06-01
  amount       NUMERIC(12, 2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month)
)
```

---

#### `transactions`

```sql
transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id   UUID REFERENCES categories(id) ON DELETE SET NULL,
  amount        NUMERIC(12, 2) NOT NULL,
  type          TEXT CHECK(type IN ('expense', 'income')) DEFAULT 'expense',
  description   TEXT,
  merchant      TEXT,                      -- parsed merchant name
  date          DATE NOT NULL,
  source        TEXT CHECK(source IN ('manual', 'voice', 'upload')) DEFAULT 'manual',
  raw_input     TEXT,                      -- original voice/upload text before parsing
  ai_parsed     BOOLEAN DEFAULT FALSE,     -- was this LLM-parsed?
  created_at    TIMESTAMPTZ DEFAULT NOW()
)
```

---

### Relationships

```
profiles ──< categories
profiles ──< budgets
profiles ──< transactions
categories ──< budgets
categories ──< transactions
```

### Row-Level Security (RLS)

Enable RLS on all tables. Example policy for `transactions`:

```sql
-- Users can only read/write their own transactions
CREATE POLICY "Users own transactions"
ON transactions
FOR ALL
USING (auth.uid() = user_id);
```

Apply the same pattern to `budgets`, `categories`, and `profiles`.

---

## 5. API Design

Most CRUD operations go directly through the **Supabase JS client** (no custom API needed). Custom API routes handle sensitive operations: LLM calls and (later) file parsing.

### Next.js API Routes (`/pages/api/` or `/app/api/`)

---

#### `POST /api/ai/parse-transaction`

Parses raw text (from voice or manual input) into structured transaction data.

**Request:**
```json
{
  "raw_input": "Spent 450 rupees on lunch at Meghana Foods today"
}
```

**Response:**
```json
{
  "amount": 450,
  "currency": "INR",
  "description": "Lunch",
  "merchant": "Meghana Foods",
  "category_suggestion": "Food",
  "date": "2025-06-10",
  "type": "expense"
}
```

---

#### `POST /api/ai/insights`

Generates a monthly spending insight summary.

**Request:**
```json
{
  "month": "2025-06",
  "transactions": [...],
  "budgets": [...]
}
```

**Response:**
```json
{
  "summary": "You overspent on Food by ₹1,200 this month...",
  "tips": [
    "Your biggest single expense was ₹2,400 at Zomato on June 14.",
    "You stayed within budget in Transport and Utilities."
  ]
}
```

---

#### `POST /api/ai/categorize` _(optional — can be merged with parse)_

Auto-categorizes a transaction by description.

**Request:**
```json
{
  "description": "Uber ride to airport",
  "user_categories": ["Food", "Transport", "Shopping", "Utilities"]
}
```

**Response:**
```json
{
  "category": "Transport",
  "confidence": 0.95
}
```

---

## 6. Feature Breakdown

### 6.1 User Authentication

**Flow:**
1. User visits `/login` or `/signup`
2. Supabase Auth handles email/password or Google OAuth
3. On success, JWT stored in cookie; user redirected to `/dashboard`
4. Protected routes check session via `supabase.auth.getSession()`
5. On logout, session cleared and user redirected to `/login`

**Edge cases:**
- Expired session → auto-redirect to login, session refresh attempted first
- Duplicate email signup → show "Email already registered" error
- Google OAuth failure → fallback message with email option

---

### 6.2 Budget Management

**Flow:**
1. User navigates to `/budgets`
2. Selects month (defaults to current)
3. Sets a monthly spend limit per category
4. Budgets saved to `budgets` table via Supabase client
5. Dashboard fetches budgets + actual spend and computes variance

**Edge cases:**
- No budget set for a category → show "No budget" state on dashboard
- Budget set to 0 → treat as "unlimited" or warn user
- Editing budget for past month → allowed but flagged visually as historical

---

### 6.3 Transaction Management

#### Manual Entry

**Flow:**
1. User opens "Add Transaction" form
2. Fills in: amount, description, category, date, type (expense/income)
3. Submits → inserted into `transactions` via Supabase client
4. Dashboard and budget bars update in real time

**Edge cases:**
- Missing required fields → inline validation
- Future date → allow but flag with a note
- Duplicate entry → no automatic detection; user responsibility

#### Voice Input

**Flow:**
1. User taps mic button → browser Speech API starts recording
2. Transcript streamed in real time to UI text field
3. On stop, transcript sent to `POST /api/ai/parse-transaction`
4. Parsed fields pre-fill the transaction form
5. User reviews, edits if needed, and confirms

**Edge cases:**
- Browser doesn't support Speech API → show fallback text input, hide mic
- Unclear transcript → show raw text; user corrects before save
- LLM parse fails → show raw input in description field; user manually fills rest
- Partial amounts ("fifty rupees") → LLM handles number word conversion

#### Statement Upload _(Phase 3)_

Deferred. Covered in Future Enhancements.

---

### 6.4 AI Features

Covered in detail in Section 7.

---

### 6.5 Dashboard

**Flow:**
1. On load, fetch current month's transactions and budgets
2. Compute: total spent, spent per category, budget vs. actual
3. Render: summary cards, category donut chart, budget progress bars, monthly trend line
4. User can switch months via a date picker

**Edge cases:**
- No transactions for the month → empty state with "Add your first transaction" prompt
- Category has spend but no budget → show spend bar without a limit line
- Mid-month view → trend chart shows partial month clearly

---

### 6.6 Multi-Device Sync

Handled automatically by Supabase. The Supabase JS client supports real-time subscriptions:

```js
supabase
  .channel('transactions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, 
    payload => refetchTransactions())
  .subscribe()
```

No extra engineering needed for MVP beyond enabling this subscription on the dashboard.

---

## 7. AI/LLM Integration

### 7.1 Transaction Parsing

**When used:** After voice transcription or on-demand for a typed natural language input.

**System prompt:**
```
You are a financial data parser. Extract structured transaction data from the user's natural language input.
Return ONLY valid JSON with these fields: amount (number), currency (string, default INR), 
description (string), merchant (string or null), category_suggestion (string), 
date (YYYY-MM-DD, default today if not mentioned), type ("expense" or "income").
Do not include explanations. If a field cannot be determined, use null.
```

**Example input:**
```
"Paid 1200 for a haircut at Green Trends yesterday"
```

**Example output:**
```json
{
  "amount": 1200,
  "currency": "INR",
  "description": "Haircut",
  "merchant": "Green Trends",
  "category_suggestion": "Personal Care",
  "date": "2025-06-09",
  "type": "expense"
}
```

---

### 7.2 Insights Generation

**When used:** On demand ("Get Insights" button) or auto-generated at month end.

**System prompt:**
```
You are a friendly personal finance advisor. Given the user's transactions and budgets for the month, 
provide 3–5 concise, actionable insights. Be specific — mention amounts and categories. 
Tone: helpful, non-judgmental. Format: one short paragraph summary + bullet list of tips. 
Respond in plain text, no markdown.
```

**User prompt template:**
```
Month: {{month}}
Currency: {{currency}}
Budgets: {{json budgets}}
Transactions: {{json transactions (last 50, summarized)}}

Provide a spending summary and tips.
```

**Example output:**
```
You spent ₹18,400 in June, which is 12% over your total budget of ₹16,500.

- Food was your biggest overspend: ₹5,200 against a ₹3,500 budget. Swiggy orders on weekends account for most of this.
- You were well under budget on Transport (₹800 vs ₹1,500) — great work.
- You had no spend in Utilities this month. Double-check if a bill was missed.
- Your largest single transaction was ₹3,200 at Amazon on June 18.
```

---

### 7.3 Auto-Categorization

**When used:** When a manual transaction is entered without selecting a category.

**Prompt:**
```
Classify this transaction into one of the following categories: {{user_categories}}.
Transaction description: "{{description}}"
Merchant: "{{merchant}}"
Return ONLY the category name. No explanation.
```

---

### Cost Management

- Debounce AI calls — never call on every keystroke
- Cache insights per month (store in `insights` table or localStorage)
- Keep transaction payloads small — summarize before sending to LLM
- Use `max_tokens: 500–800` for parsing, `1000–1200` for insights

---

## 8. Voice Input Flow

```
User taps mic button
        │
        ▼
Browser Speech API starts (webkitSpeechRecognition / SpeechRecognition)
        │
        ▼
Transcript streams into UI input field in real time
        │
        ▼
User stops speaking (silence detected or manual stop)
        │
        ▼
Raw transcript sent to POST /api/ai/parse-transaction
        │
        ▼
LLM returns structured JSON
        │
    ┌───┴──────────────┐
    │ Parsed OK?        │
   YES                  NO
    │                   │
    ▼                   ▼
Pre-fill form      Show raw transcript
fields with        in description field;
parsed data        user fills manually
    │                   │
    └─────────┬─────────┘
              ▼
       User reviews form
              │
              ▼
       User confirms → saved to Supabase
```

**Implementation notes:**
- Check `'webkitSpeechRecognition' in window` before rendering mic button
- Set `recognition.interimResults = true` for live transcript display
- Set `recognition.lang = 'en-IN'` as default (user-configurable later)
- Show a waveform animation while recording for visual feedback
- Limit recording to 30 seconds with a countdown indicator

---

## 9. UI/UX Plan

### Pages

| Route | Description |
|---|---|
| `/` | Landing / redirect to dashboard if logged in |
| `/login` | Login form (email + Google OAuth) |
| `/signup` | Signup form |
| `/dashboard` | Main dashboard: summary cards, charts, recent transactions |
| `/transactions` | Full transaction list with filters and search |
| `/transactions/new` | Add transaction form (manual + voice) |
| `/budgets` | Set/edit monthly budgets by category |
| `/insights` | AI-generated spending insights for selected month |
| `/settings` | Profile, currency, category management |

---

### Component Structure

```
components/
├── layout/
│   ├── AppShell.tsx         # Sidebar + header + main content wrapper
│   ├── Sidebar.tsx          # Navigation links
│   └── TopBar.tsx           # User avatar, month picker, notifications
│
├── dashboard/
│   ├── SummaryCards.tsx     # Total spent, total income, budget health
│   ├── CategoryChart.tsx    # Donut chart: spend by category
│   ├── BudgetBars.tsx       # Progress bars: budget vs actual per category
│   └── TrendChart.tsx       # Line/bar chart: monthly spend over time
│
├── transactions/
│   ├── TransactionList.tsx  # Filterable, searchable list
│   ├── TransactionItem.tsx  # Single row with category icon + amount
│   ├── TransactionForm.tsx  # Add/edit form (shared by manual + voice)
│   └── VoiceInput.tsx       # Mic button + waveform + live transcript
│
├── budgets/
│   ├── BudgetGrid.tsx       # Month selector + budget cards
│   └── BudgetCard.tsx       # Per-category budget input + spend preview
│
├── insights/
│   └── InsightsPanel.tsx    # Summary paragraph + tips list
│
└── ui/
    ├── Button.tsx
    ├── Input.tsx
    ├── Modal.tsx
    ├── Badge.tsx
    └── EmptyState.tsx
```

---

### UX Principles

- **Mobile-first:** Single-column layout on mobile, sidebar on desktop ≥ 768px
- **Quick add:** Floating action button (FAB) on all pages opens `TransactionForm`
- **Offline-tolerant:** Queue failed Supabase writes and retry on reconnect (Phase 2)
- **Feedback:** Toast notifications for all create/update/delete actions
- **Empty states:** Every empty list or chart has an action prompt, not just "No data"

---

## 10. Development Roadmap

### Phase 1 — MVP (Weeks 1–4)

Goal: Working app with core tracking and auth.

- [ ] Supabase project setup: schema, RLS policies, seed categories
- [ ] Next.js project scaffold with Tailwind, Supabase client, auth helpers
- [ ] Auth: login, signup, logout, protected routes
- [ ] Manual transaction CRUD (create, list, edit, delete)
- [ ] Category management (use seeded defaults initially)
- [ ] Budget setting (monthly, per category)
- [ ] Dashboard: summary cards + budget progress bars
- [ ] Basic transaction list with category filter

**Deliverable:** A usable expense tracker deployed on Vercel.

---

### Phase 2 — AI + Voice (Weeks 5–8)

Goal: Smart input and insights.

- [ ] Voice input via Browser Speech API
- [ ] API route: `POST /api/ai/parse-transaction`
- [ ] Auto-categorization on manual entry
- [ ] API route: `POST /api/ai/insights`
- [ ] Insights page with monthly AI summary
- [ ] Dashboard: category donut chart, monthly trend chart
- [ ] Month selector on dashboard and budgets page
- [ ] Real-time sync via Supabase subscriptions

**Deliverable:** Full-featured app with AI assistance and analytics.

---

### Phase 3 — Uploads + Polish (Weeks 9–12)

Goal: Statement upload, refinement, and production hardiness.

- [ ] PDF/CSV bank statement upload and parsing (Node.js backend on Render)
- [ ] Transaction deduplication logic
- [ ] Recurring transaction detection
- [ ] Export transactions as CSV
- [ ] Settings page: currency, display name, category colors
- [ ] PWA manifest for mobile home screen install
- [ ] Error monitoring (Sentry free tier)
- [ ] Rate limiting on AI API routes

**Deliverable:** Production-grade app ready for daily use.

---

## 11. Folder Structure

```
finance-buddy/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/                    # Protected routes
│   │   ├── layout.tsx            # AppShell wrapper
│   │   ├── dashboard/page.tsx
│   │   ├── transactions/
│   │   │   ├── page.tsx
│   │   │   └── new/page.tsx
│   │   ├── budgets/page.tsx
│   │   ├── insights/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── ai/
│   │       ├── parse-transaction/route.ts
│   │       ├── insights/route.ts
│   │       └── categorize/route.ts
│   ├── layout.tsx
│   └── globals.css
│
├── components/                   # See Section 9 for tree
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser Supabase client
│   │   ├── server.ts             # Server Supabase client (for API routes)
│   │   └── middleware.ts         # Auth session refresh middleware
│   ├── ai/
│   │   ├── prompts.ts            # All LLM prompt templates
│   │   └── openai.ts             # LLM client wrapper (OpenAI or Grok)
│   ├── utils/
│   │   ├── currency.ts           # Format amounts
│   │   ├── dates.ts              # Month helpers
│   │   └── categories.ts         # Default category seeds
│   └── hooks/
│       ├── useTransactions.ts
│       ├── useBudgets.ts
│       └── useVoiceInput.ts
│
├── types/
│   └── index.ts                  # Shared TypeScript interfaces
│
├── public/
│   └── icons/
│
├── supabase/
│   ├── migrations/               # SQL migration files
│   └── seed.sql                  # Default categories seed
│
├── .env.local                    # Local environment variables
├── .env.example                  # Template for env vars
├── middleware.ts                 # Next.js auth middleware
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 12. Deployment Plan

### Frontend — Vercel

1. Push repo to GitHub
2. Connect repo to Vercel via dashboard
3. Set environment variables in Vercel project settings (see below)
4. Every push to `main` auto-deploys to production
5. Pull request branches get preview deployments automatically

### Backend — Next.js API Routes (default)

- API routes deploy as serverless functions within the same Vercel project
- No separate server needed for Phases 1–2

### Backend — Node.js on Render (Phase 3, if needed)

1. Create a Render Web Service from the repo's `/server` subfolder
2. Set `BUILD_COMMAND=npm install` and `START_COMMAND=node index.js`
3. Use Render's free tier; note: spins down after inactivity (acceptable for PDF parsing)

### Supabase

1. Create project at supabase.com
2. Run migration files from `supabase/migrations/` via Supabase SQL editor or CLI
3. Run `supabase/seed.sql` for default categories
4. Enable RLS on all tables

---

### Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # server-side only

# AI
OPENAI_API_KEY=sk-...               # or Grok equivalent
AI_MODEL=gpt-4o-mini                # or grok-beta

# App
NEXT_PUBLIC_APP_URL=https://finance-buddy.vercel.app
```

**Rules:**
- `NEXT_PUBLIC_` prefix = exposed to browser → only Supabase URL and anon key
- All AI keys → server-side only, never prefixed with `NEXT_PUBLIC_`
- Add all keys to Vercel Environment Variables before deploying

---

## 13. Security Considerations

### Authentication

- Supabase Auth handles all session management; tokens are short-lived JWTs
- `middleware.ts` protects all `/app/*` routes — redirects unauthenticated users to `/login`
- Supabase sessions auto-refresh using the built-in `pkce` flow
- Never store tokens in `localStorage`; use Supabase's cookie-based session

### Row-Level Security (RLS)

- RLS enabled on **every** user-data table
- All policies use `auth.uid() = user_id` — no user can access another's data
- Even if the anon key is exposed, RLS prevents cross-user data access
- Service role key (bypasses RLS) used only in server-side API routes

### API Key Protection

- AI API keys (OpenAI/Grok) stored only in server-side env vars
- All LLM calls go through Next.js API routes — client never touches AI keys directly
- Rate-limit AI routes: max 20 requests/minute per user using Upstash Redis (Phase 2)
- Validate and sanitize all inputs before sending to LLM (prevent prompt injection)

### Data Privacy

- No PII sent to LLM beyond what's in the transaction description (user-controlled)
- Avoid sending full transaction history to AI — summarize and truncate first
- HTTPS enforced by Vercel and Supabase by default
- Users can delete their account + all data (cascade deletes via FK constraints)

### General

- Use `zod` to validate all API route request bodies
- Sanitize user input to prevent XSS (React escapes by default; be careful with `dangerouslySetInnerHTML`)
- Set `Content-Security-Policy` headers via `next.config.js`
- Keep dependencies updated; use `npm audit` regularly

---

## 14. Future Enhancements

### Statement Parsing (Phase 3)

- Upload PDF bank/credit card statements
- Parse with `pdf-parse` (Node.js) and extract transaction rows via regex or LLM
- Support formats: HDFC, ICICI, Axis, SBI, Axis credit card PDFs
- Deduplication: match uploaded transactions against existing ones by date + amount

### Advanced Analytics

- Year-over-year spending comparisons
- Savings rate tracker (income vs. expenses)
- Category-wise spend forecasting based on historical data
- Anomaly detection: flag unusually large transactions

### Recurring Transactions

- Detect recurring patterns (same merchant, similar amount, monthly cadence)
- Auto-create future transactions or send reminders
- Mark transactions as recurring manually

### Mobile App

- Progressive Web App (PWA): add to home screen on iOS/Android (Phase 2 partial)
- React Native app using Expo (long-term) sharing the same Supabase backend
- Push notifications for budget alerts via Expo or Web Push API

### Multi-Currency Support

- Per-transaction currency with conversion to base currency
- Exchange rate API integration (ExchangeRate-API free tier)

### Shared Budgets

- Invite a partner/family member to a shared budget workspace
- Supabase RLS extended to support workspace-level ownership

### Integrations

- Google Sheets export via Google Sheets API
- WhatsApp bot for quick transaction entry via Twilio
- Email digest: weekly/monthly spending summary delivered to inbox

---

*Last updated: June 2025 | Solo developer project | Prioritize free-tier tools*
