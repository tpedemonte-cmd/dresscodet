import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePlan } from '@/lib/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface SessionInfo {
  amount: number;
  currency: string;
  product: string;
  product_label: string;
}

export default function Checkout() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { refreshPlan } = usePlan();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [name, setName] = useState('');
  const [expiry, setExpiry] = useState('12/30');
  const [cvc, setCvc] = useState('123');

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.functions.invoke('mock-payments', {
        body: { action: 'get_session', session_id: sessionId },
      });
      if (!active) return;
      if (error || data?.error) {
        setSession(null);
      } else {
        setSession({
          amount: Number(data.amount),
          currency: data.currency,
          product: data.product ?? 'premium',
          product_label: data.product_label ?? 'DressCode',
        });
        if (data.status === 'paid') setPaid(true);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const isSubscription = session?.product === 'premium';
  const priceText = session ? `${session.amount.toFixed(2)} ${session.currency}` : '';

  const pay = async () => {
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke('mock-payments', {
        body: { action: 'confirm_payment', session_id: sessionId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPaid(true);
      refreshPlan();
      toast.success(
        isSubscription ? '¡Pago simulado aprobado! Ya sos Premium.' : '¡Pago simulado aprobado! Ya tenés tus avatares.'
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No pudimos procesar el pago');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-10">
        <p className="font-body text-foreground">No encontramos este pago.</p>
        <Button variant="warm" onClick={() => navigate('/premium')}>Volver a Premium</Button>
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4 py-10">
        <CheckCircle2 className="h-14 w-14 text-primary mx-auto" />
        <h2 className="text-2xl font-display font-bold text-foreground">
          {isSubscription ? '¡Listo, sos Premium!' : '¡Listo, ya tenés tus avatares!'}
        </h2>
        <p className="font-body text-muted-foreground">
          {isSubscription
            ? `Tu suscripción de ${priceText} al mes quedó activa en esta cuenta.`
            : `Sumamos ${session.product_label.toLowerCase()} a tu cuenta. Podés usarlos cuando quieras.`}
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="warm" onClick={() => navigate('/probador')}>Ir al probador</Button>
          <Button variant="outline" onClick={() => navigate('/premium')}>Ver mi plan</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-display font-bold text-foreground">
          {isSubscription ? 'Pago de la suscripción' : 'Pago de avatares'}
        </h2>
        <p className="font-body text-muted-foreground">
          {session.product_label} · {priceText}
          {isSubscription ? ' por mes' : ' (pago único)'}
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card" className="font-body">Número de tarjeta</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="card" className="pl-9" value={card} onChange={(e) => setCard(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" className="font-body">Nombre en la tarjeta</Label>
          <Input id="name" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="exp" className="font-body">Vencimiento</Label>
            <Input id="exp" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvc" className="font-body">CVC</Label>
            <Input id="cvc" value={cvc} onChange={(e) => setCvc(e.target.value)} />
          </div>
        </div>

        <Button variant="warm" size="lg" className="w-full" onClick={pay} disabled={paying}>
          {paying ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
          Pagar {priceText}
        </Button>

        <p className="flex items-center justify-center gap-1 text-xs font-body text-muted-foreground">
          <ShieldCheck className="h-4 w-4" /> Entorno de prueba: no se cobra dinero real.
        </p>
      </div>
    </div>
  );
}
