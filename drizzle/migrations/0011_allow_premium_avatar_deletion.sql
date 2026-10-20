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
  IF NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id = uid AND plan = 'premium' AND status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
     AND NOT EXISTS(SELECT 1 FROM public.avatar_credits WHERE user_id = uid AND balance > 0) THEN
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