ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'disponible';

ALTER TABLE public.clothing_items
  DROP CONSTRAINT IF EXISTS clothing_items_availability_check;

ALTER TABLE public.clothing_items
  ADD CONSTRAINT clothing_items_availability_check
  CHECK (availability IN ('disponible','lavado','prestada','arreglo','guardada'));