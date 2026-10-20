-- Apply only to the external data project; preserves all existing rows.
BEGIN;
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
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
 IF p_use_credit THEN
  UPDATE public.avatar_credits SET balance = balance - 1, updated_at = now()
  WHERE user_id = p_user_id AND balance > 0;
  IF NOT FOUND THEN RAISE EXCEPTION 'No quedan avatares extra disponibles.'; END IF;
 ELSIF EXISTS (SELECT 1 FROM public.ai_usage_events WHERE user_id = p_user_id AND kind = 'avatar') OR EXISTS (SELECT 1 FROM public.user_models WHERE user_id = p_user_id) THEN
  RAISE EXCEPTION 'Ya usaste tu generación inicial. Comprá un pack para generar otro avatar.';
 END IF;
 INSERT INTO public.ai_usage_events(user_id, kind, used_credit) VALUES(p_user_id, 'avatar', p_use_credit);
END;
$$;
REVOKE ALL ON FUNCTION public.record_avatar_generation(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_avatar_generation(uuid, boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.record_tryon_generation(p_user_id uuid, p_plan_tier text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE month_used integer; day_used integer; month_limit integer;
BEGIN
 IF p_plan_tier NOT IN ('free', 'premium') THEN RAISE EXCEPTION 'Plan inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 1));
 SELECT count(*) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'), count(*) FILTER (WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') INTO month_used, day_used FROM public.ai_usage_events WHERE user_id = p_user_id AND kind = 'tryon' AND plan_tier = p_plan_tier;
 month_limit := CASE WHEN p_plan_tier = 'premium' THEN 15 ELSE 2 END;
 IF month_used >= month_limit THEN RAISE EXCEPTION 'Llegaste al límite de outfits de este mes.'; END IF;
 IF p_plan_tier = 'premium' AND day_used >= 5 THEN RAISE EXCEPTION 'Llegaste a los 5 outfits de hoy. Volvé mañana.'; END IF;
 INSERT INTO public.ai_usage_events(user_id, kind, used_credit, plan_tier) VALUES (p_user_id, 'tryon', false, p_plan_tier);
END;
$$;
REVOKE ALL ON FUNCTION public.record_tryon_generation(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_tryon_generation(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.acquire_avatar_generation_lock(uuid, uuid), public.release_avatar_generation_lock(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acquire_avatar_generation_lock(uuid, uuid), public.release_avatar_generation_lock(uuid, uuid) TO service_role;
GRANT ALL ON public.ai_usage_events, public.avatar_credits, public.avatar_generation_locks TO service_role;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_events, public.avatar_credits FROM anon, authenticated;
GRANT SELECT ON public.ai_usage_events, public.avatar_credits TO authenticated;
DROP POLICY IF EXISTS "Users can insert own ai usage" ON public.ai_usage_events;
CREATE OR REPLACE FUNCTION public.guard_free_saved_model()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid; model_count integer;
BEGIN
 IF auth.role() = 'service_role' THEN
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN uid := OLD.user_id; ELSE uid := NEW.user_id; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
 IF TG_OP = 'DELETE' THEN
  IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id = uid AND plan = 'premium' AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now())) AND NOT EXISTS(SELECT 1 FROM public.avatar_credits WHERE user_id = uid AND balance > 0) THEN
   RAISE EXCEPTION 'Comprá avatares extra para eliminar y reemplazar tu modelo.';
  END IF;
  RETURN OLD;
 ELSIF TG_OP = 'INSERT' THEN
  SELECT count(*) INTO model_count FROM public.user_models WHERE user_id = uid;
  IF model_count >= 1 THEN RAISE EXCEPTION 'Solo podés guardar un modelo. Comprá un pack para reemplazarlo.'; END IF;
 ELSIF TG_OP = 'UPDATE' THEN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.image_url IS DISTINCT FROM OLD.image_url THEN
   RAISE EXCEPTION 'Para reemplazar tu modelo necesitás un avatar extra.';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS guard_free_saved_model ON public.user_models;
CREATE TRIGGER guard_free_saved_model BEFORE INSERT OR UPDATE OR DELETE ON public.user_models FOR EACH ROW EXECUTE FUNCTION public.guard_free_saved_model();

COMMIT;
