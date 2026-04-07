
-- Create saved_looks table
CREATE TABLE public.saved_looks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  item_ids UUID[] NOT NULL DEFAULT '{}',
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own looks" ON public.saved_looks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own looks" ON public.saved_looks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own looks" ON public.saved_looks FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for look images
INSERT INTO storage.buckets (id, name, public) VALUES ('look-images', 'look-images', true);

CREATE POLICY "Users can upload look images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'look-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Anyone can view look images" ON storage.objects FOR SELECT USING (bucket_id = 'look-images');
CREATE POLICY "Users can delete their look images" ON storage.objects FOR DELETE USING (bucket_id = 'look-images' AND auth.uid() IS NOT NULL);
