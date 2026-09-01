export type Availability = 'disponible' | 'lavado' | 'prestada' | 'arreglo';

export const AVAILABILITY_OPTIONS: {
  value: Availability;
  label: string;
  emoji: string;
  className: string;
}[] = [
  { value: 'disponible', label: 'Disponible', emoji: '✅', className: 'bg-primary/15 text-primary' },
  { value: 'lavado', label: 'En lavado', emoji: '🧼', className: 'bg-blue-500/15 text-blue-600' },
  { value: 'prestada', label: 'Prestada', emoji: '🤝', className: 'bg-amber-500/15 text-amber-600' },
  { value: 'arreglo', label: 'En arreglo', emoji: '🧵', className: 'bg-purple-500/15 text-purple-600' },
];

export function getAvailability(value?: string | null) {
  return AVAILABILITY_OPTIONS.find((o) => o.value === value) ?? AVAILABILITY_OPTIONS[0];
}

export function isAvailable(item: { availability?: string | null }) {
  return (item.availability ?? 'disponible') === 'disponible';
}
