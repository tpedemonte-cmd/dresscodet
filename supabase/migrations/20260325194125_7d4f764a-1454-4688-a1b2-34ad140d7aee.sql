-- Create clothing_items table
CREATE TABLE public.clothing_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('remera', 'pantalon', 'campera', 'buzo', 'camisa', 'short', 'vestido', 'pollera', 'zapatillas', 'zapatos', 'accesorio', 'otro')),
  color TEXT,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own clothing" ON public.clothing_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own clothing" ON public.clothing_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own clothing" ON public.clothing_items FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own clothing" ON public.clothing_items FOR UPDATE USING (auth.uid() = user_id);

-- Storage bucket for clothing photos
INSERT INTO storage.buckets (id, name, public) VALUES ('clothing-photos', 'clothing-photos', true);

CREATE POLICY "Users can upload clothing photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'clothing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Anyone can view clothing photos" ON storage.objects FOR SELECT USING (bucket_id = 'clothing-photos');
CREATE POLICY "Users can delete their clothing photos" ON storage.objects FOR DELETE USING (bucket_id = 'clothing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);