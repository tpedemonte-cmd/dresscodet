import { describe, expect, it } from 'vitest';
import { BASE_AVATAR_FOOTWEAR, clothingReplacementPlan } from '../../supabase/functions/_shared/clothingRules';

describe('avatar clothing rules', () => {
  it('generates base avatars with neither shoes nor socks', () => {
    expect(BASE_AVATAR_FOOTWEAR).toEqual({ shoes: false, socks: false });
  });

  it.each(['remera', 'pantalon', 'medias', 'zapatillas', 'campera', 'buzo', 'camisa', 'short', 'vestido', 'pollera', 'zapatos', 'accesorio', 'otro'])('replaces existing clothing in category %s rather than adding another', category => {
    expect(clothingReplacementPlan([category])).toEqual([{
      category, removeExisting: true, selectedGarments: 1, allowSameCategoryLayering: false,
    }]);
  });

  it('keeps replacement separate for a shirt and a jacket', () => {
    expect(clothingReplacementPlan(['remera', 'campera']).map(rule => rule.category)).toEqual(['remera', 'campera']);
  });
});