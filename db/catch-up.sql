-- ===== drizzle/migrations/0000_add_medias_category.sql =====
ALTER TABLE public.clothing_items DROP CONSTRAINT IF EXISTS clothing_items_category_check;
ALTER TABLE public.clothing_items ADD CONSTRAINT clothing_items_category_check CHECK (category = ANY (ARRAY['remera','pantalon','campera','buzo','camisa','short','vestido','pollera','zapatillas','zapatos','medias','accesorio','otro']));
-- ===== drizzle/migrations/0001_add_clothing_availability.sql =====
ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'disponible';

ALTER TABLE public.clothing_items
  DROP CONSTRAINT IF EXISTS clothing_items_availability_check;

ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_availability_check
  CHECK (availability IN ('disponible','lavado','prestada','arreglo','guardada'));
-- ===== drizzle/migrations/0002_remove_guardada_availability.sql =====
ALTER TABLE public.clothing_items
  DROP CONSTRAINT IF EXISTS clothing_items_availability_check;

UPDATE public.clothing_items
  SET availability = 'disponible'
  WHERE availability = 'guardada';

ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_availability_check
  CHECK (availability IN ('disponible','lavado','prestada','arreglo'));
-- ===== drizzle/migrations/0003_add_subcategory_to_clothing_items.sql =====
ALTER TABLE public.clothing_items ADD COLUMN IF NOT EXISTS subcategory text;
-- ===== drizzle/migrations/0004_create_subscriptions_and_payment_sessions.sql =====
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled')),
  price_amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  interval TEXT NOT NULL DEFAULT 'month',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscription" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscription" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 1.00,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_sessions TO authenticated;
GRANT ALL ON public.payment_sessions TO service_role;

ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.payment_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.payment_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.payment_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
-- ===== drizzle/migrations/0005_fix_look_images_ownership_and_job_locks.sql =====
DROP POLICY IF EXISTS "Users can delete their look images" ON storage.objects;
CREATE POLICY "Users can delete their look images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'look-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload look images" ON storage.objects;
CREATE POLICY "Users can upload look images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'look-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

REVOKE ALL ON public.job_locks FROM anon, authenticated;
GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.job_locks IS 'Internal job coordination table. Service-role only: no end-user access by design.';
-- ===== drizzle/migrations/0006_catch_up_schema_for_self_hosted_project.sql =====
-- Catch-up migration: schema applied directly to the hosted DB but missing a migration file.

ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'disponible';

ALTER TABLE public.clothing_items DROP CONSTRAINT IF EXISTS clothing_items_availability_check;
ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_availability_check
  CHECK (availability IN ('disponible', 'lavado', 'prestada', 'arreglo'));

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled')),
  price_amount numeric NOT NULL DEFAULT 1.00,
  currency text NOT NULL DEFAULT 'USD',
  interval text NOT NULL DEFAULT 'month',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own subscription" ON public.subscriptions;
CREATE POLICY "Users view own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;
CREATE POLICY "Users insert own subscription" ON public.subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own subscription" ON public.subscriptions;
CREATE POLICY "Users update own subscription" ON public.subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 1.00,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON public.payment_sessions TO authenticated;
GRANT ALL ON public.payment_sessions TO service_role;
ALTER TABLE public.payment_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own sessions" ON public.payment_sessions;
CREATE POLICY "Users view own sessions" ON public.payment_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own sessions" ON public.payment_sessions;
CREATE POLICY "Users insert own sessions" ON public.payment_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own sessions" ON public.payment_sessions;
CREATE POLICY "Users update own sessions" ON public.payment_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_locks FROM anon, authenticated;
GRANT ALL ON public.job_locks TO service_role;


-- =========================================================
-- Créditos de avatares comprados + registro de uso de IA
-- (plan gratis: 1 modelo; packs de avatares extra)
-- =========================================================
create table if not exists public.avatar_credits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0,
  updated_at timestamptz not null default now()
);
grant select on public.avatar_credits to authenticated;
grant all on public.avatar_credits to service_role;
alter table public.avatar_credits enable row level security;
drop policy if exists "Users can read own avatar credits" on public.avatar_credits;
create policy "Users can read own avatar credits"
  on public.avatar_credits for select to authenticated using (auth.uid() = user_id);

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('avatar', 'tryon')),
  used_credit boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_events_user_kind_created_idx
  on public.ai_usage_events (user_id, kind, created_at desc);
grant select, insert on public.ai_usage_events to authenticated;
grant all on public.ai_usage_events to service_role;
alter table public.ai_usage_events enable row level security;
drop policy if exists "Users can read own ai usage" on public.ai_usage_events;
create policy "Users can read own ai usage"
  on public.ai_usage_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own ai usage" on public.ai_usage_events;
create policy "Users can insert own ai usage"
  on public.ai_usage_events for insert to authenticated with check (auth.uid() = user_id);

alter table public.payment_sessions
  add column if not exists product text not null default 'premium';
