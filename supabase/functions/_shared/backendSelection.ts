export type DataBackend = 'cloud' | 'external';

export function selectDataBackend(value: string | null): DataBackend {
  if (value === null || value === 'cloud') return 'cloud';
  if (value === 'external') return 'external';
  throw new Error('Conexión de datos no válida.');
}