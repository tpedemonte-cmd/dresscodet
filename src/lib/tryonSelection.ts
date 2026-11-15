import { isAvailable } from './availability';

type CategorizedItem = { id: string; category: string; availability?: string | null };

export function hasCategoryConflict<T extends CategorizedItem>(selected: readonly T[], item: T): boolean {
  return selected.some(existing => existing.id !== item.id && existing.category === item.category);
}

export function canSelectForTryon(item: CategorizedItem): boolean {
  return isAvailable(item);
}

export function toggleOutfitItem<T extends CategorizedItem>(selected: readonly T[], item: T): T[] {
  if (selected.some(existing => existing.id === item.id)) {
    return selected.filter(existing => existing.id !== item.id);
  }
  // Only available items (not washing, lent or being repaired) can be added.
  if (!canSelectForTryon(item)) return [...selected];
  // Tapping another item from the same category swaps it in at the same
  // position, so the outfit keeps its original order.
  const swapped = selected.map(existing => (existing.category === item.category ? item : existing));
  if (swapped.some(existing => existing.id === item.id)) return swapped;
  // No item of this category yet: add it.
  return [...selected, item];
}

/**
 * Drops selected items whose current wardrobe status is no longer available
 * (or that were deleted), using the latest wardrobe data as the source of truth.
 */
export function keepAvailableSelection<T extends CategorizedItem>(selected: readonly T[], wardrobe: readonly CategorizedItem[]): T[] {
  const byId = new Map(wardrobe.map(item => [item.id, item]));
  return selected.filter(item => {
    const current = byId.get(item.id);
    return !!current && canSelectForTryon(current);
  });
}
