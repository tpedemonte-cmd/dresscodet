
CREATE TABLE public.outfit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mood TEXT NOT NULL,
  event TEXT NOT NULL,
  temperature INTEGER NOT NULL,
  weather TEXT NOT NULL,
  season TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  recommended_item_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.outfit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history" ON public.outfit_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own history" ON public.outfit_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own history" ON public.outfit_history FOR DELETE USING (auth.uid() = user_id);
