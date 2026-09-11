import { usePlan, PREMIUM_PRICE, PREMIUM_CURRENCY } from '@/lib/plan';
import { useNavigate } from 'react-router-dom';
import { Crown, Megaphone, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const ADS = [
  { title: 'Zapatillas urbanas 30% OFF', text: 'Envío gratis a todo el país · Publicidad' },
  { title: '2x1 en remeras básicas', text: 'Solo por hoy en tiendas seleccionadas · Publicidad' },
  { title: 'Lavandería a domicilio', text: 'Tu ropa lista en 24hs · Publicidad' },
];

const DISMISS_KEY = 'dresscode_ad_dismissed';
const SHOW_AD_KEY = 'dresscode_ad_show';
const ACTION_COUNT_KEY = 'dresscode_ad_action_count';
const ACTION_THRESHOLD = 15;
const CLOSE_DELAY_SECONDS = 5;

function getActionCount() {
  if (typeof localStorage === 'undefined') return 0;
  const v = localStorage.getItem(ACTION_COUNT_KEY);
  return v ? parseInt(v, 10) || 0 : 0;
}

function setActionCount(n: number) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(ACTION_COUNT_KEY, String(n));
}

function shouldShowAd() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(SHOW_AD_KEY) === 'true';
}

function setShowAd(show: boolean) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(SHOW_AD_KEY, String(show));
}

export default function AdBanner({ index = 0 }: { index?: number }) {
  const { isPremium } = usePlan();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(true);
  const [ready, setReady] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CLOSE_DELAY_SECONDS);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      setDismissed(localStorage.getItem(DISMISS_KEY) === 'true' || !shouldShowAd());
    }
    setReady(true);

    const onAction = (e: MouseEvent | TouchEvent) => {
      if (isPremium) return;
      if (shouldShowAd()) return; // ya debe mostrarse, no contar más
      const target = e.target as HTMLElement | null;
      if (!target) return;

      const interactive = target.closest('button, a, [role="button"], input[type="submit"]');
      if (!interactive) return;

      const count = getActionCount() + 1;
      setActionCount(count);
      if (count >= ACTION_THRESHOLD) {
        setShowAd(true);
        setActionCount(0);
        setDismissed(false);
      }
    };

    document.addEventListener('click', onAction, true);
    return () => document.removeEventListener('click', onAction, true);
  }, [isPremium]);

  useEffect(() => {
    if (dismissed || isPremium) return;
    setSecondsLeft(CLOSE_DELAY_SECONDS);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [dismissed, isPremium]);

  if (!ready || isPremium || dismissed) return null;

  const ad = ADS[index % ADS.length];
  const canClose = secondsLeft <= 0;

  const close = (force = false) => {
    if (!canClose && !force) return;
    setDismissed(true);
    setShowAd(false);
    if (typeof localStorage !== 'undefined') localStorage.setItem(DISMISS_KEY, 'true');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div ref={ref} className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-primary/10 animate-in zoom-in-95">
        <button
          onClick={() => close()}
          disabled={!canClose}
          className="absolute right-3 top-3 rounded-full p-2 text-muted-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-secondary hover:enabled:text-foreground"
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
            onClick={() => {
              close(true);
              navigate('/premium');
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-body font-semibold text-primary-foreground transition-transform hover:scale-105 active:scale-95"
          >
            <Crown className="h-5 w-5" /> Quitar anuncios · {PREMIUM_PRICE} {PREMIUM_CURRENCY}/mes
          </button>
          {canClose ? (
            <button
              onClick={() => close()}
              className="text-sm font-body text-muted-foreground underline hover:text-foreground"
            >
              Cerrar anuncio
            </button>
          ) : (
            <p className="text-sm font-body text-muted-foreground">
              Podés cerrar este anuncio en {secondsLeft} segundos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

