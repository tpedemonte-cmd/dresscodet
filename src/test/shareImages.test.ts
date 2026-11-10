import { describe, it, expect } from 'vitest';
import { buildShareFileName } from '@/lib/shareImages';

describe('buildShareFileName', () => {
  it('da un archivo distinto a cada prenda aunque tengan el mismo nombre', () => {
    const used = new Set<string>();
    expect(buildShareFileName('Jean Azul', 'image/jpeg', used)).toBe('Jean-Azul.jpg');
    expect(buildShareFileName('Jean Azul', 'image/jpeg', used)).toBe('Jean-Azul-2.jpg');
  });

  it('usa la extensión del tipo de imagen y quita acentos', () => {
    expect(buildShareFileName('Pantalón Ñandú', 'image/png', new Set())).toBe('Pantalon-Nandu.png');
  });
});
