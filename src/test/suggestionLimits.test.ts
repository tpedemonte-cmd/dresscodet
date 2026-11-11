import { describe, it, expect } from 'vitest';
import { suggestionDailyLimit, suggestionsLeft } from '../../supabase/functions/_shared/suggestionLimits';

describe('límite diario de sugerencias', () => {
  it('Premium no tiene límite diario', () => {
    expect(suggestionDailyLimit(true)).toBeNull();
    expect(suggestionsLeft(true, 50)).toBeNull();
  });
  it('el plan gratis tiene 2 por día', () => {
    expect(suggestionDailyLimit(false)).toBe(2);
    expect(suggestionsLeft(false, 1)).toBe(1);
    expect(suggestionsLeft(false, 2)).toBe(0);
  });
});
