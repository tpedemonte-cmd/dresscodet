import { describe, expect, it } from 'vitest';
import { canSaveItem, resolveItemName } from '../lib/addItemForm';

const base = {
  name: '',
  category: 'pantalon',
  subcategory: 'Jean',
  color: 'Gris',
  hasPhoto: true,
  detecting: false,
};

describe('add item form', () => {
  it('names the item from the detected subtype and color when the name is left empty', () => {
    expect(resolveItemName(base)).toBe('Jean Gris');
  });

  it('keeps a typed name over the detected one', () => {
    expect(resolveItemName({ ...base, name: '  Jean roto  ' })).toBe('Jean roto');
  });

  it('falls back to the category when nothing else is available', () => {
    expect(resolveItemName({ name: '', subcategory: '', color: '', category: 'remera' })).toBe('remera');
  });

  it('blocks saving while the color is still empty', () => {
    expect(canSaveItem({ ...base, color: '' })).toBe(false);
  });

  it('allows saving once the auto-detected color filled the field', () => {
    expect(canSaveItem(base)).toBe(true);
  });

  it('blocks saving without a photo or while detection is running', () => {
    expect(canSaveItem({ ...base, hasPhoto: false })).toBe(false);
    expect(canSaveItem({ ...base, detecting: true })).toBe(false);
  });
});
