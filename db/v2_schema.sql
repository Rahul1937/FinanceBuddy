-- ============================================================
-- Finance Buddy — V2 schema
-- Statement import + recurring/bills + 2-month retention rollup.
--
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
--
-- RLS stays OFF on purpose — access is enforced in the Next.js API routes via the
-- service-role key + getSessionUser, exactly like the existing users / sessions /
-- transactions / budgets / categories tables.
--
-- gen_random_uuid() is provided by pgcrypto, which Supabase enables by default.
-- ============================================================


-- 1) CATEGORIES ------------------------------------------------------------
-- Flag categories that are NOT real consumption (Transfer to Savings, Credit
-- Card Payment). These are excluded from spend totals / budgets / category
-- charts but still show in cashflow. Optional icon column for future use.
alter table categories add column if not exists exclude_from_spend boolean not null default false;
alter table categories add column if not exists icon text;


-- 2) STATEMENT SOURCES -----------------------------------------------------
-- Import metadata only (a saved bank/card label). NOT a wallet: no balances,
-- no transfers. cycle_day drives credit-card billing-cycle handling.
create table if not exists statement_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  name        text not null,
  kind        text not null default 'bank',      -- 'bank' | 'credit_card'
  cycle_day   int,                                -- credit-card statement close day (1-28); NULL for bank
  created_at  timestamptz not null default now()
);
create index if not exists idx_sources_user on statement_sources(user_id);


-- 3) STATEMENT IMPORTS -----------------------------------------------------
-- One audit row per uploaded PDF.
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
  status          text not null default 'review', -- 'review' | 'done' | 'failed'
  created_at      timestamptz not null default now()
);
create index if not exists idx_imports_user on statement_imports(user_id);


-- 4) RECURRING RULES (Phase C — recurring txns & bill reminders) -----------
create table if not exists recurring_rules (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  category_id  uuid references categories(id) on delete set null,
  type         text not null default 'expense',  -- 'expense' | 'income'
  amount       numeric(14,2) not null,
  merchant     text,
  notes        text,
  frequency    text not null default 'monthly',  -- 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval     int  not null default 1,          -- every N frequency units
  next_due     date not null,
  end_date     date,
  is_active    boolean not null default true,
  auto_post    boolean not null default false,   -- false = remind only; true = auto-create txn when due
  created_at   timestamptz not null default now()
);
create index if not exists idx_recurring_user on recurring_rules(user_id);


-- 5) TRANSACTIONS — new columns -------------------------------------------
-- Links to import/source/recurring, a non-spend flag, and a dedup reference.
alter table transactions add column if not exists source_id          uuid references statement_sources(id)  on delete set null;
alter table transactions add column if not exists import_id          uuid references statement_imports(id)  on delete set null;
alter table transactions add column if not exists recurring_id       uuid references recurring_rules(id)    on delete set null;
alter table transactions add column if not exists exclude_from_spend boolean not null default false;
alter table transactions add column if not exists external_ref       text;   -- bank reference no. / dedup hash if available
create index if not exists idx_tx_dedup on transactions(user_id, occurred_at, amount);


-- 6) MONTHLY SUMMARIES -----------------------------------------------------
-- Rolled-up history so raw rows older than the previous month can be deleted
-- while Reports/Insights keep working. category_name is denormalized so a
-- summary survives a later category deletion.
create table if not exists monthly_summaries (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users(id) on delete cascade,
  month              date not null,                 -- first day of the month
  category_id        uuid references categories(id) on delete set null,
  category_name      text,
  type               text not null,                 -- 'expense' | 'income'
  total              numeric(14,2) not null default 0,
  txn_count          int not null default 0,
  exclude_from_spend boolean not null default false,
  created_at         timestamptz not null default now()
);
-- coalesce so rows with a NULL category_id still dedupe correctly
create unique index if not exists monthly_summaries_uniq
  on monthly_summaries (user_id, month, type, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid));


-- 7) RETENTION FUNCTION ----------------------------------------------------
-- Rolls every transaction OLDER than the cutoff into monthly_summaries, then
-- deletes those raw rows. Net effect: only the current + previous 2 calendar
-- months of raw transactions are ever kept (see db/v4_retention.sql).
--   • App calls it per-user:  select prune_old_transactions('<user-uuid>');
--   • Cron can call it for all: select prune_old_transactions();
-- Rollup + delete run in one transaction (the function body), so it's atomic.
-- Returns the number of raw rows pruned.
drop function if exists prune_old_transactions(uuid);
create or replace function prune_old_transactions(p_user_id uuid default null)
returns integer
language plpgsql
as $$
declare
  -- keep current + previous 2 months (June -> cutoff April 1)
  cutoff date := (date_trunc('month', current_date) - interval '2 month')::date;
  deleted integer;
begin
  insert into monthly_summaries
    (user_id, month, category_id, category_name, type, total, txn_count, exclude_from_spend)
  select
    t.user_id,
    date_trunc('month', t.occurred_at)::date,
    t.category_id,
    c.name,
    t.type,
    sum(t.amount),
    count(*),
    coalesce(c.exclude_from_spend, false)
  from transactions t
  left join categories c on c.id = t.category_id
  where t.occurred_at < cutoff
    and (p_user_id is null or t.user_id = p_user_id)
  group by t.user_id, date_trunc('month', t.occurred_at), t.category_id, c.name, t.type, c.exclude_from_spend
  on conflict (user_id, month, type, coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set
    total              = monthly_summaries.total + excluded.total,
    txn_count          = monthly_summaries.txn_count + excluded.txn_count,
    category_name      = excluded.category_name,
    exclude_from_spend = excluded.exclude_from_spend;

  with del as (
    delete from transactions
    where occurred_at < cutoff
      and (p_user_id is null or user_id = p_user_id)
    returning 1
  )
  select count(*) into deleted from del;

  return deleted;
end;
$$;


-- 8) SEED NON-SPEND CATEGORIES --------------------------------------------
-- Creates "Transfer to Savings" and "Credit Card Payment" for every existing
-- user, flagged exclude_from_spend. Idempotent (skips if already present).
insert into categories (user_id, name, color, exclude_from_spend, icon)
select u.id, 'Transfer to Savings', '#0E9888', true, '🏦'
from users u
where not exists (
  select 1 from categories c where c.user_id = u.id and lower(c.name) = 'transfer to savings'
);

insert into categories (user_id, name, color, exclude_from_spend, icon)
select u.id, 'Credit Card Payment', '#94A3B8', true, '💳'
from users u
where not exists (
  select 1 from categories c where c.user_id = u.id and lower(c.name) = 'credit card payment'
);


-- 9) OPTIONAL — schedule auto-prune with pg_cron --------------------------
-- Skip this if you'd rather let the app trigger pruning on load (the default
-- I'll wire up). To use cron: Dashboard → Database → Extensions → enable
-- "pg_cron", then run the line below (prunes all users at 03:00 on the 2nd
-- of each month).
-- select cron.schedule('fb-prune', '0 3 2 * *', $$ select prune_old_transactions(); $$);
