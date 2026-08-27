ALTER TABLE public.weekly_plans ADD COLUMN IF NOT EXISTS weather_synced_at timestamptz;

CREATE TABLE IF NOT EXISTS public.job_locks (
  name text PRIMARY KEY,
  locked_until timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;