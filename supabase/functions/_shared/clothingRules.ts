/** Base models have no footwear; selected garments replace their existing category. */
export const BASE_AVATAR_FOOTWEAR = { shoes: false, socks: false } as const;

export function clothingReplacementPlan(categories: readonly string[]) {
  return [...new Set(categories)].map(category => ({
    category,
    removeExisting: true,
    selectedGarments: 1,
    allowSameCategoryLayering: false,
  } as const));
}