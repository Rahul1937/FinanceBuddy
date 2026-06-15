-- ============================================================
-- Finance Buddy — V5: scheduled retention (pg_cron)
-- Runs prune_old_transactions() for ALL users automatically, server-side,
-- regardless of whether anyone opens or refreshes the app.
--
-- Schedule: 01:00 IST, every 2 days.
--   Supabase runs pg_cron in UTC. IST = UTC+5:30 (no DST), so
--   01:00 IST  =  19:30 UTC the PREVIOUS calendar day.
--   Cron expression: '30 19 */2 * *'  (min=30, hour=19, every 2nd day-of-month).
--
-- NOTE on "every 2 days": cron's */2 on the day-of-month runs on days
--   1,3,5,...,31 and then restarts at day 1 next month, so the gap across a
--   month boundary can be 1 day instead of 2. That's fine for a retention job.
--
-- Run ONCE in the Supabase SQL editor. Safe to re-run (idempotent).
-- Requires db/v4_retention.sql first (it defines prune_old_transactions()).
-- ============================================================

-- 1) Enable pg_cron (no-op if already enabled).
create extension if not exists pg_cron;

-- 2) Remove any previous Finance Buddy prune schedule so re-running is safe.
select cron.unschedule('fb-prune')
from cron.job
where jobname = 'fb-prune';

-- 3) Schedule it: 19:30 UTC every 2nd day = 01:00 IST every 2 days.
--    p_user_id is omitted, so it prunes ALL users in one pass.
select cron.schedule(
  'fb-prune',
  '30 19 */2 * *',
  $$ select public.prune_old_transactions(); $$
);

-- ---- Handy verification queries (run separately when you want to check) ----
-- Confirm the job is registered:
--   select jobid, jobname, schedule, command, active from cron.job where jobname = 'fb-prune';
--
-- See the most recent runs (status + how many rows each call returned):
--   select start_time, status, return_message
--   from cron.job_run_details
--   where jobid = (select jobid from cron.job where jobname = 'fb-prune')
--   order by start_time desc
--   limit 10;
--
-- Run it right now to test (prunes all users immediately):
--   select prune_old_transactions();
