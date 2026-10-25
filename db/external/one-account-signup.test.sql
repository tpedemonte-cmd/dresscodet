-- Run against the external project after one-account-signup.sql. Always rolls back.
BEGIN;
DO $$
DECLARE accepted boolean := false;
BEGIN
  BEGIN
    INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'not-authorized@example.invalid');
    RAISE EXCEPTION 'Unexpectedly allowed an unauthorized account';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'El registro está cerrado para esta cuenta.' THEN RAISE; END IF;
  END;
  IF EXISTS (SELECT 1 FROM public.signup_allowances WHERE email = 'caronoval@yahoo.com' AND remaining = 1) THEN
    INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'caronoval@yahoo.com');
    accepted := true;
    IF (SELECT remaining FROM public.signup_allowances WHERE email = 'caronoval@yahoo.com') <> 0 THEN
      RAISE EXCEPTION 'Authorized signup did not consume its single allowance';
    END IF;
  END IF;
  BEGIN
    INSERT INTO auth.users(id, email) VALUES (gen_random_uuid(), 'caronoval@yahoo.com');
    RAISE EXCEPTION 'Unexpectedly allowed a second authorized account';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'El registro está cerrado para esta cuenta.' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;