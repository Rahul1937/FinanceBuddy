-- ============================================================
-- Finance Buddy — V4 retention update
-- Keep the CURRENT + previous 2 calendar months of raw transactions.
-- (When today is June: keep April, May, June; roll March & older into
--  monthly_summaries and delete those raw rows.)
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run.
-- Replaces the prune_old_transactions() function from v2_schema.sql.
-- ============================================================

-- Return type changes from void -> integer, so the old function is dropped first.
drop function if exists prune_old_transactions(uuid);

create or replace function prune_old_transactions(p_user_id uuid default null)
returns integer
language plpgsql
as $$
declare
  -- Keep current + previous 2 months. cutoff = first day of (this month - 2).
  -- June -> April 1, so anything before April 1 (March & older) is pruned.
  cutoff date := (date_trunc('month', current_date) - interval '2 month')::date;
  deleted integer;
begin
  -- 1) Roll up everything older than the cutoff into monthly_summaries.
  --    (Additive on conflict, so repeated prunes accumulate correctly. Raw rows
  --     are deleted right after, so each raw row is only ever counted once.)
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

  -- 2) Delete the now-summarized raw rows, counting how many were removed.
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
