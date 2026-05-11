
ALTER TABLE public.outfit_history
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

ALTER TABLE public.weekly_plans
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;

-- Allow updates on outfit_history (only for the owner) so feedback can be edited
DROP POLICY IF EXISTS "Users can update their own history" ON public.outfit_history;
CREATE POLICY "Users can update their own history"
ON public.outfit_history
FOR UPDATE
USING (auth.uid() = user_id);
