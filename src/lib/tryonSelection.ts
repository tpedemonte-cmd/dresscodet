type CategorizedItem = { id: string; category: string };

export function hasCategoryConflict<T extends CategorizedItem>(selected: readonly T[], item: T): boolean {
  return selected.some(existing => existing.id !== item.id && existing.category === item.category);
}

export function toggleOutfitItem<T extends CategorizedItem>(selected: readonly T[], item: T): T[] {
  if (selected.some(existing => existing.id === item.id)) {
    return selected.filter(existing => existing.id !== item.id);
  }
  if (hasCategoryConflict(selected, item)) return [...selected];
  return [...selected, item];
}