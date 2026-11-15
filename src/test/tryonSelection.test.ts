import { describe, expect, it } from 'vitest';
import { canSelectForTryon, hasCategoryConflict, keepAvailableSelection, toggleOutfitItem } from '../lib/tryonSelection';

describe('outfit category selection', () => {
  it.each(['remera', 'pantalon', 'campera', 'buzo', 'camisa', 'short', 'vestido', 'pollera', 'zapatillas', 'zapatos', 'accesorio', 'otro'])('swaps a second item into category %s', category => {
    const first = { id: 'first', category };
    const second = { id: 'second', category };
    expect(hasCategoryConflict([first], second)).toBe(true);
    expect(toggleOutfitItem([first], second)).toEqual([second]);
  });

  it('allows different categories together', () => {
    const shirt = { id: 'shirt', category: 'remera' };
    const socks = { id: 'socks', category: 'medias' };
    expect(toggleOutfitItem([shirt], socks)).toEqual([shirt, socks]);
  });

  it('keeps the swapped item in the same slot so the outfit order holds', () => {
    const shirt = { id: 'shirt', category: 'remera' };
    const jeansBlue = { id: 'jeans-blue', category: 'pantalon' };
    const jeansBlack = { id: 'jeans-black', category: 'pantalon' };
    expect(toggleOutfitItem([shirt, jeansBlue], jeansBlack)).toEqual([shirt, jeansBlack]);
  });

  it('deselects the item when tapped again', () => {
    const first = { id: 'first', category: 'medias' };
    expect(toggleOutfitItem([first], first)).toEqual([]);
  });
});

describe('only available items can be tried on', () => {
  it.each(['lavado', 'prestada', 'arreglo'])('does not select an item with status %s', availability => {
    const shirt = { id: 'shirt', category: 'remera' };
    const jeans = { id: 'jeans', category: 'pantalon', availability };
    expect(canSelectForTryon(jeans)).toBe(false);
    expect(toggleOutfitItem([shirt], jeans)).toEqual([shirt]);
  });

  it('does not swap in an unavailable item of the same category', () => {
    const jeansBlue = { id: 'jeans-blue', category: 'pantalon', availability: 'disponible' };
    const jeansWashing = { id: 'jeans-washing', category: 'pantalon', availability: 'lavado' };
    expect(toggleOutfitItem([jeansBlue], jeansWashing)).toEqual([jeansBlue]);
  });

  it('selects an available item', () => {
    const jeans = { id: 'jeans', category: 'pantalon', availability: 'disponible' };
    expect(toggleOutfitItem([], jeans)).toEqual([jeans]);
  });

  it('removes previously selected items that are no longer available or were deleted', () => {
    const shirt = { id: 'shirt', category: 'remera', availability: 'disponible' };
    const jeans = { id: 'jeans', category: 'pantalon', availability: 'disponible' };
    const shoes = { id: 'shoes', category: 'zapatillas', availability: 'disponible' };
    const wardrobe = [shirt, { ...jeans, availability: 'prestada' }];
    expect(keepAvailableSelection([shirt, jeans, shoes], wardrobe)).toEqual([shirt]);
  });
});
