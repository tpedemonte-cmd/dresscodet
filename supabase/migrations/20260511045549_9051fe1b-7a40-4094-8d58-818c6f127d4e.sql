CREATE TABLE public.weekly_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_date DATE NOT NULL,
  plan_time TEXT,
  event TEXT NOT NULL,
  formality TEXT,
  location_name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  temperature INTEGER,
  weather TEXT,
  weather_label TEXT,
  season TEXT,
  wind_kmh NUMERIC,
  rain_probability NUMERIC,
  is_night BOOLEAN DEFAULT false,
  recommendation TEXT,
  recommended_item_ids UUID[] DEFAULT '{}'::uuid[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans" ON public.weekly_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own plans" ON public.weekly_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plans" ON public.weekly_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plans" ON public.weekly_plans FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_weekly_plans_user_date ON public.weekly_plans(user_id, plan_date);