ALTER TABLE public.ai_usage_events ADD COLUMN plan_tier text NOT NULL DEFAULT 'free';
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_events_plan_tier_check CHECK (plan_tier IN ('free', 'premium'));
COMMENT ON COLUMN public.ai_usage_events.plan_tier IS 'Plan charged for this generation; free usage never reduces Premium quotas.';
UPDATE public.ai_usage_events e SET plan_tier = 'premium' WHERE e.kind = 'tryon' AND EXISTS (SELECT 1 FROM public.payment_sessions p WHERE p.user_id = e.user_id AND p.product = 'premium' AND p.status = 'paid' AND p.paid_at <= e.created_at AND e.created_at < p.paid_at + interval '1 month');
CREATE INDEX ai_usage_events_tryon_plan_window_idx ON public.ai_usage_events (user_id, plan_tier, created_at) WHERE kind = 'tryon';
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