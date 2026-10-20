import { BriefcaseBusiness, Heart, Users, House, PartyPopper, Dumbbell, GraduationCap } from 'lucide-react';

// Keep the previous presentation available while the user reviews the visual trial.
export const REALISTIC_ICON_TRIAL = true;

export const OCCASIONS = [
  { value: 'trabajo', label: 'Trabajo', emoji: '💼', icon: BriefcaseBusiness },
  { value: 'cita', label: 'Cita', emoji: '❤️', icon: Heart },
  { value: 'amigos', label: 'Juntada con amigos', emoji: '🍻', icon: Users },
  { value: 'familia', label: 'Familia', emoji: '👨‍👩‍👧', icon: House },
  { value: 'fiesta', label: 'Fiesta', emoji: '🎉', icon: PartyPopper },
  { value: 'gym', label: 'Gym / Deporte', emoji: '🏋️', icon: Dumbbell },
  { value: 'universidad', label: 'Universidad', emoji: '📚', icon: GraduationCap },
];

export default function OccasionLabel({ value }: { value: string }) {
  const occasion = OCCASIONS.find((entry) => entry.value === value);
  if (!occasion) return <>{value}</>;
  const Icon = occasion.icon;
  return (
    <span className="inline-flex items-center gap-2">
      {REALISTIC_ICON_TRIAL ? <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-current" strokeWidth={1.5} /> : <span>{occasion.emoji}</span>}
      <span>{occasion.label}</span>
    </span>
  );
}