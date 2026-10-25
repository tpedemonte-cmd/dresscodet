-- External data project only: one atomic, email-scoped registration allowance.
CREATE TABLE IF NOT EXISTS public.signup_allowances (
  email text PRIMARY KEY,
  remaining integer NOT NULL DEFAULT 1 CHECK (remaining BETWEEN 0 AND 1),
  consumed_at timestamptz
);
REVOKE ALL ON public.signup_allowances FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.signup_allowances TO service_role;
ALTER TABLE public.signup_allowances ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.consume_signup_allowance()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.signup_allowances
    SET remaining = 0, consumed_at = now()
    WHERE email = lower(trim(NEW.email)) AND remaining = 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El registro está cerrado para esta cuenta.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_signup_allowance() FROM PUBLIC, anon, authenticated;

INSERT INTO public.signup_allowances(email, remaining)
SELECT 'caronoval@yahoo.com', CASE WHEN EXISTS (
  SELECT 1 FROM auth.users WHERE lower(email) = 'caronoval@yahoo.com'
) THEN 0 ELSE 1 END
ON CONFLICT (email) DO NOTHING;

DROP TRIGGER IF EXISTS dresscode_signup_allowance ON auth.users;
CREATE TRIGGER dresscode_signup_allowance BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.consume_signup_allowance();