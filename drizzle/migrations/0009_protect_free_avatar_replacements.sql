CREATE TABLE public.avatar_generation_locks (
 user_id uuid PRIMARY KEY,
 token uuid NOT NULL,
 expires_at timestamptz NOT NULL
);
GRANT ALL ON public.avatar_generation_locks TO service_role;
ALTER TABLE public.avatar_generation_locks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.acquire_avatar_generation_lock(p_user_id uuid, p_token uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 INSERT INTO public.avatar_generation_locks(user_id, token, expires_at)
 VALUES(p_user_id, p_token, now() + interval '10 minutes')
 ON CONFLICT(user_id) DO UPDATE SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at
 WHERE avatar_generation_locks.expires_at < now();
 RETURN FOUND;
END;
$$;
CREATE OR REPLACE FUNCTION public.release_avatar_generation_lock(p_user_id uuid, p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
 DELETE FROM public.avatar_generation_locks WHERE user_id = p_user_id AND token = p_token;
$$;
CREATE OR REPLACE FUNCTION public.record_avatar_generation(p_user_id uuid, p_use_credit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF p_use_credit THEN
  UPDATE public.avatar_credits SET balance = balance - 1, updated_at = now()
  WHERE user_id = p_user_id AND balance > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'No quedan avatares extra disponibles.'; END IF;
 END IF;
 INSERT INTO public.ai_usage_events(user_id, kind, used_credit) VALUES(p_user_id, 'avatar', p_use_credit);
END;
$$;
REVOKE ALL ON FUNCTION public.acquire_avatar_generation_lock(uuid, uuid), public.release_avatar_generation_lock(uuid, uuid), public.record_avatar_generation(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_avatar_generation_lock(uuid, uuid), public.release_avatar_generation_lock(uuid, uuid), public.record_avatar_generation(uuid, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.guard_free_saved_model()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; premium boolean; model_count integer;
BEGIN
 IF auth.role() = 'service_role' THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN uid := OLD.user_id; ELSE uid := NEW.user_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id = uid AND plan = 'premium' AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now())) INTO premium;
 IF premium THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN
  IF NOT EXISTS(SELECT 1 FROM public.avatar_credits WHERE user_id = uid AND balance > 0) THEN
   RAISE EXCEPTION 'Comprá avatares extra para eliminar y reemplazar tu modelo.';
  END IF;
  RETURN OLD;
 ELSIF TG_OP = 'INSERT' THEN
  SELECT count(*) INTO model_count FROM public.user_models WHERE user_id = uid;
  IF model_count >= 1 THEN RAISE EXCEPTION 'El plan gratis permite un único modelo guardado.'; END IF;
 ELSIF TG_OP = 'UPDATE' THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.image_url IS DISTINCT FROM OLD.image_url THEN
   RAISE EXCEPTION 'Para reemplazar tu modelo necesitás un avatar extra.';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER guard_free_saved_model BEFORE INSERT OR UPDATE OR DELETE ON public.user_models FOR EACH ROW EXECUTE FUNCTION public.guard_free_saved_model();