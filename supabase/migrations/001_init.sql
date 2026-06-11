-- 001_init.sql
-- Initial schema and RLS policies for Finance Buddy

create extension if not exists "pgcrypto";

-- Custom auth users and sessions
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  token text not null unique,
  user_agent text,
  ip text,
  expires_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

create index if not exists sessions_token_idx on public.sessions (token);
create index if not exists sessions_user_id_idx on public.sessions (user_id);

-- Transactions table
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  type text not null check (type in ('expense','income','transfer')),
  category_id uuid,
  merchant text,
  notes text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists transactions_user_id_idx on public.transactions (user_id);
create index if not exists transactions_occurred_at_idx on public.transactions (occurred_at);

alter table public.transactions enable row level security;
create policy "Transactions: users can manage their own rows" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Budgets table
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  month date not null,
  category_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists budgets_user_id_idx on public.budgets (user_id);
create index if not exists budgets_month_idx on public.budgets (month);

alter table public.budgets enable row level security;
create policy "Budgets: users can manage their own rows" on public.budgets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  color text,
  created_at timestamptz not null default now()
);
create index if not exists categories_user_id_idx on public.categories (user_id);

alter table public.categories enable row level security;
create policy "Categories: users can manage their own rows" on public.categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
