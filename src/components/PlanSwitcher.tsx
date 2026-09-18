import { usePlan, formatPrice } from '@/lib/plan';
import { Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PlanSwitcher() {
  const { isPremium } = usePlan();

  if (isPremium) {
    return (
      <Link
        to="/premium"
        className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-[11px] font-body font-semibold text-primary-foreground"
      >
        <Crown className="h-3 w-3" /> Premium
      </Link>
    );
  }

  return (
    <Link
      to="/premium"
      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-body font-medium text-foreground hover:bg-secondary/70 transition-colors"
    >
      <Crown className="h-3 w-3 text-primary" /> Pasar a Premium · {formatPrice(PREMIUM_PLACEHOLDER)}/mes
    </Link>
  );
}
