import { Link } from 'react-router-dom';
import { Check, Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PremiumBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-[11px] font-body font-medium px-2 py-0.5">
      <Crown className="h-3 w-3" /> Premium
    </span>
  );
}

export default function PremiumGate({
  title,
  description,
  benefits = [],
  actionLabel = 'Pasar a Premium',
}: {
  title: string;
  description: string;
  benefits?: string[];
  actionLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 text-center space-y-4 shadow-card">
      <div className="absolute inset-x-0 top-0 h-1 gradient-warm" />
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <Lock className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-lg font-body font-bold text-foreground">{title}</p>
        <p className="text-sm font-body text-muted-foreground">{description}</p>
      </div>
      {benefits.length > 0 && (
        <div className="grid gap-2 text-left sm:grid-cols-3">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-body font-medium text-foreground">{benefit}</span>
            </div>
          ))}
        </div>
      )}
      <Button size="sm" variant="warm" asChild>
        <Link to="/premium">
          <Crown className="h-4 w-4 mr-2" /> {actionLabel}
        </Link>
      </Button>
    </div>
  );
}
