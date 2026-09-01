ALTER TABLE public.clothing_items
  DROP CONSTRAINT IF EXISTS clothing_items_availability_check;

UPDATE public.clothing_items
  SET availability = 'disponible'
  WHERE availability = 'guardada';

ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_availability_check
  CHECK (availability IN ('disponible','lavado','prestada','arreglo'));