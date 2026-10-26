-- db/external/add-item-material.sql
-- Agrega la columna material a clothing_items en la base propia (tejido del sweater, etc.).
ALTER TABLE public.clothing_items
  ADD COLUMN IF NOT EXISTS material TEXT;
COMMENT ON COLUMN public.clothing_items.material IS 'Material principal de la prenda (lana, hilo, algodón, etc.), detectado por IA o manual.';
