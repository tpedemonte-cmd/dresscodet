import { describe, expect, it } from 'vitest';
import { availableItemIds, isAvailable } from '../lib/availability';

describe('only available clothes are used in outfits', () => {
  it.each(['lavado', 'prestada', 'arreglo'])('treats status %s as not available', availability => {
    expect(isAvailable({ availability })).toBe(false);
  });

  it('treats items without a status as available', () => {
    expect(isAvailable({ availability: null })).toBe(true);
  });

  it('drops AI-picked items that are in laundry, lent, under repair or deleted', () => {
    const wardrobe = [
      { id: 'shirt', availability: 'disponible' },
      { id: 'jeans', availability: 'lavado' },
      { id: 'jacket', availability: 'prestada' },
      { id: 'shoes', availability: 'arreglo' },
    ];
    expect(availableItemIds(['shirt', 'jeans', 'jacket', 'shoes', 'deleted'], wardrobe)).toEqual(['shirt']);
  });
});
