CREATE TABLE public.user_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  height integer NOT NULL,
  weight integer NOT NULL,
  age integer NOT NULL,
  gender text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_models TO authenticated;
GRANT ALL ON public.user_models TO service_role;

ALTER TABLE public.user_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own models" ON public.user_models FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own models" ON public.user_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own models" ON public.user_models FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own models" ON public.user_models FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_models_updated_at
BEFORE UPDATE ON public.user_models
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();