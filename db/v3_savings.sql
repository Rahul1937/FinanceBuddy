-- ============================================================
-- Finance Buddy — V3 schema
-- Savings tracker + Miscellaneous catch-all category.
--
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
--
-- RLS stays OFF on purpose — access is enforced in the Next.js API routes via
-- the service-role key + getSessionUser, like every other table.
-- ============================================================


-- 1) CATEGORIES — savings flag ---------------------------------------------
-- Marks categories that represent money moved into savings/investments
-- (Transfer to Savings, Invest in Stocks, SIP, Savings Account). These are
-- already exclude_from_spend=true so they never count as consumption; the
-- is_savings flag lets the savings tracker pull them in separately.
alter table categories add column if not exists is_savings boolean not null default false;


-- 2) SAVINGS GOALS ---------------------------------------------------------
-- One overall monthly savings target per user/month (not per-goal).
create table if not exists savings_goals (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  month       date not null,                 -- first day of the month
  amount      numeric(14,2) not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists savings_goals_uniq on savings_goals (user_id, month);


-- 3) Mark the existing "Transfer to Savings" category as a savings category -
update categories set is_savings = true
where lower(name) = 'transfer to savings' and is_savings = false;


-- 4) SEED savings sub-categories -------------------------------------------
-- Invest in Stocks / SIP / Savings Account — all are savings + non-spend.
-- Idempotent per user (skips if a category with that name already exists).
insert into categories (user_id, name, color, exclude_from_spend, is_savings, icon)
select u.id, v.name, v.color, true, true, v.icon
from users u
cross join (values
  ('Invest in Stocks', '#6366F1', '📈'),
  ('SIP',              '#0EA5E9', '🔁'),
  ('Savings Account',  '#10B981', '🏦')
) as v(name, color, icon)
where not exists (
  select 1 from categories c where c.user_id = u.id and lower(c.name) = lower(v.name)
);


-- 5) SEED Miscellaneous catch-all category ---------------------------------
-- A regular (spend) category so uncategorised transactions can be grouped and
-- budgeted. The app also buckets any still-uncategorised spend under this.
insert into categories (user_id, name, color, exclude_from_spend, is_savings, icon)
select u.id, 'Miscellaneous', '#A1A1AA', false, false, '📦'
from users u
where not exists (
  select 1 from categories c where c.user_id = u.id and lower(c.name) = 'miscellaneous'
);
