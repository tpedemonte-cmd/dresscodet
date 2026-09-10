import { usePlan, PREMIUM_PRICE, PREMIUM_CURRENCY } from '@/lib/plan';
import { Button } from '@/components/ui/button';
import { Crown, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const BENEFITS = [
  'Sin anuncios en toda la app',
  'Historial completo de outfits (el plan gratis ve los últimos 5)',
  'Varios modelos realistas para elegir en el probador',
  'Probarte la ropa con tu propia foto',
  'Medidas corporales avanzadas para un calce más preciso',
];

export default function Premium() {
  const { isPremium, subscription, startCheckout, startingCheckout, cancelSubscription } = usePlan();
  const navigate = useNavigate();

  const goCheckout = async () => {
    try {
      const url = await startCheckout();
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
            {PREMIUM_PRICE} {PREMIUM_CURRENCY}
            <span className="text-base font-body font-normal text-muted-foreground">/mes</span>
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
            Suscribirme por {PREMIUM_PRICE} {PREMIUM_CURRENCY} al mes
          </Button>
        )}

        <p className="text-xs font-body text-muted-foreground text-center">
          Entorno de prueba: el pago es simulado y no se cobra dinero real.
        </p>
      </div>
    </div>
  );
}
