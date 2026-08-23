-- ============================================================
-- Finance Buddy — RESET ALL DATA (fresh start before prod)
--
-- ⚠️  DESTRUCTIVE & IRREVERSIBLE. Deletes EVERY row from EVERY app table,
--     including all user accounts and sessions (the custom auth tables).
--     Table structures, indexes, functions, and the pg_cron job are kept.
--
-- Run ONCE in the Supabase SQL editor when you want a clean database.
-- Does NOT touch Supabase's internal `auth.*` schema (this app uses custom auth).
-- ============================================================

truncate table
  monthly_summaries,
  statement_imports,
  statement_sources,
  recurring_rules,
  savings_goals,
  budgets,
  transactions,
  categories,
  sessions,
  users
restart identity cascade;

-- Optional: confirm everything is empty (should all be 0).
-- select
--   (select count(*) from users)              as users,
--   (select count(*) from sessions)           as sessions,
--   (select count(*) from categories)         as categories,
--   (select count(*) from transactions)       as transactions,
--   (select count(*) from budgets)            as budgets,
--   (select count(*) from savings_goals)      as savings_goals,
--   (select count(*) from recurring_rules)    as recurring_rules,
--   (select count(*) from statement_sources)  as statement_sources,
--   (select count(*) from statement_imports)  as statement_imports,
--   (select count(*) from monthly_summaries)  as monthly_summaries;
