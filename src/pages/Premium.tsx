import { usePlan, PREMIUM_PRICE, formatPrice, LIMITS, AVATAR_PACKS, AvatarPackKey } from '@/lib/plan';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2, Sparkles } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';

const BENEFITS = [
  'Sin anuncios en toda la app',
  '15 outfits generados por mes en el probador, hasta 5 por día',
  'Una generación inicial con 3 opciones para elegir un único modelo; los reemplazos requieren un pack',
  'Más datos para el modelo: pelo, piel, contextura y medidas corporales',
  'Probarte la ropa con tu propia foto',
  'Máxima calidad de imagen en el probador',
  'Plan semanal con un outfit para cada salida',
  'Viajes: qué llevar y qué comprar según el destino',
  'Historial completo de outfits (el plan gratis ve los últimos 5)',
  'Recomendaciones de outfit del momento sin límite diario',
];

export default function Premium() {
  const {
    isPremium,
    subscription,
    startCheckout,
    startingCheckout,
    cancelSubscription,
    startAvatarCheckout,
    startingAvatarCheckout,
    quota,
  } = usePlan();
  const navigate = useNavigate();
  const { hash } = useLocation();

  useEffect(() => {
    if (hash === '#avatares-extra') {
      document.getElementById('avatares-extra')?.scrollIntoView({ block: 'start' });
    }
  }, [hash, isPremium]);

  const goCheckout = async () => {
    try {
      const url = await startCheckout();
      navigate(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos iniciar el pago');
    }
  };

  const buyPack = async (pack: AvatarPackKey) => {
    try {
      const url = await startAvatarCheckout(pack);
      navigate(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos iniciar el pago');
    }
  };

  const cancel = async () => {
    try {
      await cancelSubscription();
      toast.success('Suscripción cancelada. Volvés al plan gratis.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos cancelar la suscripción');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-display font-bold text-foreground">DressCode Premium</h2>
        <p className="font-body text-muted-foreground">Suscripción mensual, cancelás cuando quieras.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-5">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <div className="rounded-xl bg-primary/10 p-2">
              <Crown className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-body font-semibold text-foreground">Plan Premium</p>
              <p className="text-sm font-body text-muted-foreground">Facturación mensual</p>
            </div>
          </div>
          <p className="text-2xl font-display font-bold text-foreground">
            {formatPrice(PREMIUM_PRICE)}
            <span className="text-base font-body font-normal text-muted-foreground"> /mes</span>
          </p>
        </div>

        <ul className="space-y-2">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 font-body text-foreground">
              <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {isPremium ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-secondary p-4 font-body text-sm text-foreground">
              Tu cuenta es Premium
              {subscription?.current_period_end && (
                <> · se renueva el {new Date(subscription.current_period_end).toLocaleDateString('es-AR')}</>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={cancel}>
              Cancelar suscripción
            </Button>
          </div>
        ) : (
          <Button variant="warm" size="lg" className="w-full" onClick={goCheckout} disabled={startingCheckout}>
            {startingCheckout ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Crown className="h-5 w-5 mr-2" />}
            Suscribirme por {formatPrice(PREMIUM_PRICE)} al mes
          </Button>
        )}

        <p className="text-xs font-body text-muted-foreground text-center">
          Entorno de prueba: el pago es simulado y no se cobra dinero real.
        </p>
      </div>

      <div id="avatares-extra" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 shadow-card space-y-4">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/10 p-2">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-body font-semibold text-foreground">Avatares extra</p>
            <p className="text-sm font-body text-muted-foreground">
              Pago único, sin suscripción. No vencen.
            </p>
          </div>
        </div>

        <p className="font-body text-sm text-muted-foreground">
          {isPremium ? 'Premium incluye una única generación inicial con 3 opciones para elegir un modelo.' : `El plan gratis incluye ${LIMITS.free.avatarFreeTotal} modelo.`} Para generar otro, comprá avatares extra. Cada generación Premium ofrece 3 opciones y consume un solo avatar.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {AVATAR_PACKS.map((p) => (
            <div key={p.key} className="rounded-xl border border-border p-4 space-y-2">
              <p className="font-body font-semibold text-foreground">{p.title}</p>
              <p className="text-xl font-display font-bold text-foreground">
                {formatPrice(p.price)}
              </p>
              <p className="text-xs font-body text-muted-foreground">{p.note}</p>
              <Button
                variant="warm"
                onClick={() => buyPack(p.key)}
                disabled={startingAvatarCheckout}
              >
                {startingAvatarCheckout ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Comprar
              </Button>
            </div>
          ))}
        </div>

        <div className="rounded-xl bg-secondary p-3 font-body text-sm text-foreground">
          Tenés {quota.avatarCredits} avatar{quota.avatarCredits === 1 ? '' : 'es'} comprado
          {quota.avatarCredits === 1 ? '' : 's'} sin usar.
        </div>
      </div>
    </div>
  );
}
