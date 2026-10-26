import { describe, expect, it } from 'vitest';
import { hasCategoryConflict, toggleOutfitItem } from '../lib/tryonSelection';

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
