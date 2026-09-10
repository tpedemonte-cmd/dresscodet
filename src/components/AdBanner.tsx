import { usePlan } from '@/lib/plan';
import { Crown, Megaphone, X } from 'lucide-react';
import { useState, useEffect } from 'react';

const ADS = [
  { title: 'Zapatillas urbanas 30% OFF', text: 'Envío gratis a todo el país · Publicidad' },
  { title: '2x1 en remeras básicas', text: 'Solo por hoy en tiendas seleccionadas · Publicidad' },
  { title: 'Lavandería a domicilio', text: 'Tu ropa lista en 24hs · Publicidad' },
];

const DISMISS_KEY = 'dresscode_ad_dismissed';

export default function AdBanner({ index = 0 }: { index?: number }) {
  const { isPremium, setPlan } = usePlan();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setDismissed(localStorage.getItem(DISMISS_KEY) === 'true');
    }
  }, []);

  if (isPremium || dismissed) return null;

  const ad = ADS[index % ADS.length];

  const close = () => {
    setDismissed(true);
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/10 animate-in zoom-in-95">
        <button
          onClick={close}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Cerrar anuncio"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-2xl bg-secondary p-4">
            <Megaphone className="h-10 w-10 text-primary" />
          </div>
          <div>
            <p className="text-lg font-body font-semibold text-foreground">{ad.title}</p>
            <p className="text-base font-body text-muted-foreground mt-1">{ad.text}</p>
          </div>
          <button
            onClick={() => setPlan('premium')}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-body font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <Crown className="h-5 w-5" /> Quitar anuncios
          </button>
          <button
            onClick={close}
            className="text-sm font-body text-muted-foreground underline hover:text-foreground"
          >
            Cerrar anuncio
          </button>
        </div>
      </div>
    </div>
  );
}
