# Finance Buddy

A personal finance tracker — expenses, income, budgets, savings, recurring bills, AI-powered PDF
statement import, voice entry, and analytics. Built with Next.js 16 + React 19 + Supabase, and
designed to run on free-tier infrastructure.

## Quick start

```bash
npm install --legacy-peer-deps
# create .env (see DOCUMENTATION.md → Getting started)
npm run dev
```

Then run the SQL files in `db/` (in order: `v2_schema.sql`, `v3_savings.sql`, `v4_retention.sql`,
`v5_cron.sql`) in the Supabase SQL editor.

## Documentation

See **[DOCUMENTATION.md](DOCUMENTATION.md)** for the full guide: architecture, tech stack, auth,
database schema, every feature and its behavior, the AI/statement-import pipeline, retention &
pruning, theming, the API reference, and free-tier caveats.

## Key features

- 📊 Dashboard, budgets, reports, and AI insights
- 🎙️ Voice transaction entry (Web Speech API + AI parsing)
- 📄 AI-powered bank/credit-card **PDF statement import** with duplicate detection and
  credit-card double-count handling
- 🐷 Monthly savings goals & tracker
- 🔁 Recurring bills & income (with auto-post)
- 🗂️ Free-tier retention: keeps current + previous 2 months of raw transactions, rolls older
  months into summaries (server-scheduled via `pg_cron`)
