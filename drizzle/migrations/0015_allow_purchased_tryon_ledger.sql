ALTER TABLE public.ai_usage_events DROP CONSTRAINT ai_usage_events_kind_check;
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_events_kind_check CHECK (kind IN ('avatar', 'tryon', 'outfit', 'tryon_credit'));
ALTER TABLE public.ai_usage_events DROP CONSTRAINT ai_usage_events_plan_tier_check;
ALTER TABLE public.ai_usage_events ADD CONSTRAINT ai_usage_events_plan_tier_check CHECK (plan_tier IN ('free', 'premium', 'extra'));
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_events FROM anon, authenticated;
GRANT SELECT ON public.ai_usage_events TO authenticated;
GRANT ALL ON public.ai_usage_events TO service_role;