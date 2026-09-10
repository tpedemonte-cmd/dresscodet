import { usePlan } from '@/lib/plan';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-body font-medium px-2 py-0.5">
      <Crown className="h-3 w-3" /> Premium
    </span>
  );
}

export default function PremiumGate({ title, description }: { title: string; description: string }) {
  const { setPlan } = usePlan();
  return (
    <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2 shadow-card">
      <div className="flex items-center justify-center gap-2">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-body font-medium text-foreground">{title}</p>
      </div>
      <p className="text-xs font-body text-muted-foreground">{description}</p>
      <Button size="sm" variant="warm" onClick={() => setPlan('premium')}>
        <Crown className="h-4 w-4 mr-2" /> Pasar a Premium
      </Button>
    </div>
  );
}
