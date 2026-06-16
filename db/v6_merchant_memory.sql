-- ============================================================
-- Finance Buddy — V6: merchant -> category memory
-- Remembers the category you assign to a merchant so future imports of the
-- same merchant are auto-categorized the same way (survives pruning).
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- ============================================================

create table if not exists merchant_categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  merchant_key text not null,                 -- normalized merchant name (lowercase, no punctuation)
  category_id  uuid not null references categories(id) on delete cascade,
  updated_at   timestamptz not null default now()
);

-- One mapping per merchant per user (upsert target).
create unique index if not exists merchant_categories_uniq
  on merchant_categories (user_id, merchant_key);

create index if not exists idx_merchant_categories_user on merchant_categories(user_id);
