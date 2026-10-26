ALTER TABLE public.clothing_items
  DROP CONSTRAINT IF EXISTS clothing_items_category_check;
ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_category_check CHECK (category IN
    ('remera', 'pantalon', 'campera', 'buzo', 'sweater', 'camisa',
     'short', 'vestido', 'pollera', 'zapatillas', 'zapatos',
     'medias', 'accesorio', 'otro'));