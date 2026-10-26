export type ItemFormValues = {
  name: string;
  category: string;
  subcategory: string;
  color: string;
  hasPhoto: boolean;
  detecting: boolean;
};

export function resolveItemName(values: Pick<ItemFormValues, 'name' | 'subcategory' | 'color' | 'category'>): string {
  return values.name.trim() || [values.subcategory, values.color].filter(Boolean).join(' ') || values.category;
}

export function canSaveItem(values: ItemFormValues): boolean {
  return Boolean(
    resolveItemName(values) && values.category && values.color && values.hasPhoto && !values.detecting,
  );
}
