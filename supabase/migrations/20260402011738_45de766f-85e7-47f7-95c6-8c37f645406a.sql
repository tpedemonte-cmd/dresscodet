
CREATE TABLE public.wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id text NOT NULL,
  title text NOT NULL,
  price numeric NOT NULL,
  currency text NOT NULL DEFAULT 'ARS',
  thumbnail text NOT NULL,
  image text,
  permalink text NOT NULL,
  free_shipping boolean DEFAULT false,
  seller text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wishlist" ON public.wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into their own wishlist" ON public.wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete from their own wishlist" ON public.wishlist FOR DELETE USING (auth.uid() = user_id);
