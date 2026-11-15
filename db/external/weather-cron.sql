-- Run once in your own project's SQL editor, AFTER uploading refresh-plan-weather.
-- Refreshes the weather of upcoming weekly plans every day at 09:00 UTC (06:00 Buenos Aires).
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule(jobid) from cron.job where jobname = 'refresh-plan-weather-daily';

select cron.schedule(
  'refresh-plan-weather-daily',
  '0 9 * * *',
  $$
  select net.http_post(
    url := 'https://pacjpldmhjjfawkcyzib.supabase.co/functions/v1/refresh-plan-weather',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  );
  $$
);
