export type SubcategoryOption = { value: string; label: string };

// Subtipos por categoría. Los `value` se guardan en clothing_items.subcategory
export const SUBCATEGORIES: Record<string, SubcategoryOption[]> = {
  remera: [
    { value: 'manga_corta', label: 'Manga corta' },
    { value: 'manga_larga', label: 'Manga larga' },
    { value: 'musculosa', label: 'Musculosa' },
    { value: 'oversize', label: 'Oversize' },
    { value: 'deportiva', label: 'Deportiva' },
  ],
  pantalon: [
    { value: 'jean', label: 'Jean' },
    { value: 'jogging', label: 'Jogging' },
    { value: 'chino', label: 'Chino' },
    { value: 'cargo', label: 'Cargo' },
    { value: 'vestir', label: 'De vestir' },
    { value: 'calza', label: 'Calza' },
  ],
  campera: [
    { value: 'inflable', label: 'Inflable' },
    { value: 'jean', label: 'De jean' },
    { value: 'cuero', label: 'De cuero' },
    { value: 'rompeviento', label: 'Rompeviento' },
    { value: 'sobretodo', label: 'Sobretodo / Tapado' },
    { value: 'liviana', label: 'Liviana' },
  ],
  buzo: [
    { value: 'canguro', label: 'Con capucha (canguro)' },
    { value: 'capucha_cierre', label: 'Con capucha y cierre' },
    { value: 'sin_capucha', label: 'Sin capucha (cuello redondo)' },
    { value: 'medio_cierre', label: 'Medio cierre' },
    { value: 'cierre_completo', label: 'Cierre completo sin capucha' },
    { value: 'cuello_alto', label: 'Cuello alto' },
    { value: 'polar', label: 'Polar' },
    { value: 'deportivo', label: 'Deportivo / Técnico' },
    { value: 'oversize', label: 'Oversize' },
    { value: 'corto', label: 'Corto (crop)' },
    { value: 'lana', label: 'De lana' },
    { value: 'frisa', label: 'De frisa' },
  ],
  sweater: [
    { value: 'cuello_redondo', label: 'Cuello redondo' },
    { value: 'cuello_v', label: 'Cuello en V' },
    { value: 'cuello_alto', label: 'Cuello alto / Rollito' },
    { value: 'cardigan', label: 'Cardigan / Sacón' },
    { value: 'chaleco', label: 'Chaleco tejido' },
  ],
  camisa: [
    { value: 'manga_corta', label: 'Manga corta' },
    { value: 'manga_larga', label: 'Manga larga' },
    { value: 'lino', label: 'De lino' },
    { value: 'jean', label: 'De jean' },
    { value: 'franela', label: 'Franela / Cuadrillé' },
  ],
  short: [
    { value: 'jean', label: 'De jean' },
    { value: 'deportivo', label: 'Deportivo' },
    { value: 'bermuda', label: 'Bermuda' },
    { value: 'baño', label: 'De baño' },
  ],
  vestido: [
    { value: 'corto', label: 'Corto' },
    { value: 'midi', label: 'Midi' },
    { value: 'largo', label: 'Largo' },
    { value: 'fiesta', label: 'De fiesta' },
  ],
  pollera: [
    { value: 'corta', label: 'Corta' },
    { value: 'midi', label: 'Midi' },
    { value: 'larga', label: 'Larga' },
    { value: 'jean', label: 'De jean' },
  ],
  zapatillas: [
    { value: 'urbanas', label: 'Urbanas' },
    { value: 'deportivas', label: 'Deportivas / Running' },
    { value: 'botitas', label: 'Botitas' },
    { value: 'lona', label: 'De lona' },
  ],
  zapatos: [
    { value: 'vestir', label: 'De vestir' },
    { value: 'mocasines', label: 'Mocasines' },
    { value: 'botas', label: 'Botas' },
    { value: 'sandalias', label: 'Sandalias' },
    { value: 'chatitas', label: 'Chatitas' },
  ],
  medias: [
    { value: 'cortas', label: 'Cortas / Soquetes' },
    { value: 'largas', label: 'Largas' },
    { value: 'deportivas', label: 'Deportivas' },
    { value: 'termicas', label: 'Térmicas' },
  ],
  accesorio: [
    { value: 'gorra', label: 'Gorra / Sombrero' },
    { value: 'bufanda', label: 'Bufanda' },
    { value: 'cinturon', label: 'Cinturón' },
    { value: 'bolso', label: 'Bolso / Mochila' },
    { value: 'lentes', label: 'Lentes' },
    { value: 'joya', label: 'Joyas / Reloj' },
  ],
  otro: [],
};

export const ALL_SUBCATEGORY_VALUES = Array.from(
  new Set(Object.values(SUBCATEGORIES).flatMap((list) => list.map((o) => o.value)))
);

export function getSubcategories(category?: string | null): SubcategoryOption[] {
  if (!category) return [];
  return SUBCATEGORIES[category] ?? [];
}

export function getSubcategoryLabel(category?: string | null, value?: string | null): string | null {
  if (!value) return null;
  const found = getSubcategories(category).find((o) => o.value === value);
  if (found) return found.label;
  for (const list of Object.values(SUBCATEGORIES)) {
    const hit = list.find((o) => o.value === value);
    if (hit) return hit.label;
  }
  return value;
}
