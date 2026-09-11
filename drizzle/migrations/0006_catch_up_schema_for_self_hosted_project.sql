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
