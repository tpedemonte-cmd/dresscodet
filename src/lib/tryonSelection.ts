type CategorizedItem = { id: string; category: string };

export function hasCategoryConflict<T extends CategorizedItem>(selected: readonly T[], item: T): boolean {
  return selected.some(existing => existing.id !== item.id && existing.category === item.category);
}

export function toggleOutfitItem<T extends CategorizedItem>(selected: readonly T[], item: T): T[] {
  if (selected.some(existing => existing.id === item.id)) {
    return selected.filter(existing => existing.id !== item.id);
  }
  // Tapping another item from the same category swaps it in at the same
  // position, so the outfit keeps its original order.
  const swapped = selected.map(existing => (existing.category === item.category ? item : existing));
  if (swapped.some(existing => existing.id === item.id)) return swapped;
  // No item of this category yet: add it.
  return [...selected, item];
}
