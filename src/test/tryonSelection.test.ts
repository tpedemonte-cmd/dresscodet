import { describe, expect, it } from 'vitest';
import { hasCategoryConflict, toggleOutfitItem } from '../lib/tryonSelection';

describe('outfit category selection', () => {
  it('blocks selecting two pairs of socks in one outfit', () => {
    const socks = { id: 'socks-1', category: 'medias' };
    const otherSocks = { id: 'socks-2', category: 'medias' };
    expect(hasCategoryConflict([socks], otherSocks)).toBe(true);
    expect(toggleOutfitItem([socks], otherSocks)).toEqual([socks]);
  });

  it.each(['remera', 'pantalon', 'campera', 'buzo', 'camisa', 'short', 'vestido', 'pollera', 'zapatillas', 'zapatos', 'accesorio', 'otro'])('blocks a second item in category %s', category => {
    const first = { id: 'first', category };
    expect(toggleOutfitItem([first], { id: 'second', category })).toEqual([first]);
  });

  it('allows different categories together', () => {
    const shirt = { id: 'shirt', category: 'remera' };
    const socks = { id: 'socks', category: 'medias' };
    expect(toggleOutfitItem([shirt], socks)).toEqual([shirt, socks]);
  });

  it('allows deselection and choosing another item from that category', () => {
    const first = { id: 'first', category: 'medias' };
    const second = { id: 'second', category: 'medias' };
    const cleared = toggleOutfitItem([first], first);
    expect(cleared).toEqual([]);
    expect(toggleOutfitItem(cleared, second)).toEqual([second]);
  });
});