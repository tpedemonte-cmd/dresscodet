import { describe, it, expect } from 'vitest';
import { SUBCATEGORIES, getSubcategories, getSubcategoryLabel } from '@/lib/subcategories';

// Regla del usuario: la categoría "Sweater" es todo lo que es tejido/cocido.
describe('categoría sweater', () => {
  it('existe como categoría con subtipos tejidos', () => {
    expect(SUBCATEGORIES.sweater).toBeDefined();
    expect(getSubcategories('sweater').length).toBeGreaterThan(0);
  });

  it('incluye cardigan y chaleco entre sus subtipos', () => {
    const values = SUBCATEGORIES.sweater.map((o) => o.value);
    expect(values).toContain('cardigan');
    expect(values).toContain('chaleco');
  });

  it('no absorbe los subtipos del buzo', () => {
    const values = SUBCATEGORIES.sweater.map((o) => o.value);
    expect(values).not.toContain('frisa');
    expect(values).not.toContain('canguro');
  });

  it('resuelve etiquetas legibles para sus subtipos', () => {
    expect(getSubcategoryLabel('sweater', 'cardigan')).toBe('Cardigan / Sacón');
  });
});
