import { usePlan } from '@/lib/plan';
import { Crown } from 'lucide-react';

export default function PlanSwitcher() {
  const { plan, setPlan } = usePlan();

  return (
    <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
      {(['free', 'premium'] as const).map((p) => (
        <button
          key={p}
          onClick={() => setPlan(p)}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-body font-medium transition-colors ${
            plan === p ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {p === 'premium' && <Crown className="h-3 w-3" />}
          {p === 'free' ? 'Gratis' : 'Premium'}
        </button>
      ))}
    </div>
  );
}
