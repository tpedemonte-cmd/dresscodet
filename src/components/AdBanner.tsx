import { usePlan } from '@/lib/plan';
import { Crown, Megaphone } from 'lucide-react';

const ADS = [
  { title: 'Zapatillas urbanas 30% OFF', text: 'Envío gratis a todo el país · Publicidad' },
  { title: '2x1 en remeras básicas', text: 'Solo por hoy en tiendas seleccionadas · Publicidad' },
  { title: 'Lavandería a domicilio', text: 'Tu ropa lista en 24hs · Publicidad' },
];

export default function AdBanner({ index = 0 }: { index?: number }) {
  const { isPremium, setPlan } = usePlan();
  if (isPremium) return null;

  const ad = ADS[index % ADS.length];

  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/60 p-4 flex items-center gap-3">
      <div className="rounded-lg bg-background p-2.5">
        <Megaphone className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-base font-body font-medium text-foreground truncate">{ad.title}</p>
        <p className="text-sm font-body text-muted-foreground truncate">{ad.text}</p>
      </div>
      <button
        onClick={() => setPlan('premium')}
        className="shrink-0 inline-flex items-center gap-1 text-sm font-body font-medium text-primary hover:underline"
      >
        <Crown className="h-4 w-4" /> Quitar anuncios
      </button>
    </div>
  );
}
