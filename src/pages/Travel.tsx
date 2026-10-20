import ExplanationToggle from '@/components/ExplanationToggle';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plane, Sparkles, Loader2, ExternalLink, Shirt, Ban, Globe2, ShoppingBag, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '@/lib/plan';
import PremiumGate from '@/components/PremiumGate';

type BuyItem = { item: string; reason: string; search_query: string };
type WardrobeItem = { item: string; reason: string };
type TravelResult = {
  destination_summary: string;
  cultural_notes: string[];
  avoid: string[];
  from_wardrobe: WardrobeItem[];
  to_buy: BuyItem[];
};

const TRIP_TYPES = ['Turismo', 'Trabajo', 'Visita religiosa', 'Playa', 'Mochilero', 'Casamiento / evento'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getMLUrl = (query: string) =>
  `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;

type Place = { name: string; label: string };

export default function Travel() {
  const { isPremium, loading: planLoading } = usePlan();
  const [destination, setDestination] = useState('');
  const [suggestions, setSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const skipNextSearch = useRef(false);
  const [origin, setOrigin] = useState('Argentina');
  const [tripType, setTripType] = useState('Turismo');
  const [month, setMonth] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TravelResult | null>(null);
  const [resultDestination, setResultDestination] = useState('');

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const q = destination.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=es&format=json`
        );
        const json = await res.json();
        if (cancelled) return;
        const places: Place[] = (json?.results ?? []).map((r: any) => {
          const admin1 = r.admin1 && r.admin1 !== r.name && r.admin1 !== r.country ? r.admin1 : null;
          const country = r.country && r.country !== r.name ? r.country : null;
          return {
            name: r.name,
            label: [r.name, admin1, country].filter(Boolean).join(', '),
          };
        });
        const unique = places.filter((p, i) => places.findIndex((o) => o.label === p.label) === i);
        setSuggestions(unique);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      setSearching(false);
    };
  }, [destination]);

  const handleGenerate = async () => {
    if (!isPremium) {
      toast.error('Viajes es para Premium');
      return;
    }
    if (!destination.trim()) {
      toast.error('Contanos a dónde viajás');
      return;
    }
    setLoading(true);
    setResult(null);
    setResultDestination(destination.trim());
    try {
      const { data, error } = await supabase.functions.invoke('travel-wardrobe', {
        body: {
          destination: destination.trim(),
          origin,
          tripType,
          month,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as TravelResult);
    } catch (err: any) {
      if (err?.message?.includes('429')) toast.error('Demasiadas solicitudes, probá en un momento');
      else if (err?.message?.includes('402')) toast.error('Créditos agotados.');
      else toast.error('No pudimos preparar tu guía de viaje');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (planLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isPremium) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-body font-semibold text-primary">
            <Lock className="h-3.5 w-3.5" /> Premium
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center justify-center gap-2">
            <Plane className="h-6 w-6 text-primary" /> Viajes
          </h2>
          <p className="text-base text-muted-foreground font-body">Llegá con el placard correcto para cada destino.</p>
        </div>

        <PremiumGate
          title="Tu guía de ropa para viajar"
          description="Premium revisa cultura, clima y tipo de viaje para decirte qué llevar, qué evitar y qué comprar."
          benefits={['Respeta costumbres locales', 'Lista de prendas para llevar', 'Compras sugeridas por destino']}
          actionLabel="Activar Viajes Premium"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { title: 'Estambul en octubre', text: 'Capas livianas, prendas recatadas y calzado cómodo.' },
            { title: 'Casamiento en Río', text: 'Look de evento adaptado al clima y al lugar.' },
          ].map((preview) => (
            <div key={preview.title} className="rounded-xl border border-border bg-card/70 p-4 shadow-card opacity-80">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-body font-semibold text-foreground">{preview.title}</p>
                <Lock className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-body text-muted-foreground">{preview.text}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center justify-center gap-2">
          <Plane className="h-6 w-6 text-primary" /> Viajes
        </h2>
        <p className="text-base text-muted-foreground font-body">
          Qué llevar y qué comprar según la cultura y el clima del destino
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
        <div className="space-y-1.5 relative">
          <label className="text-sm font-body font-semibold text-foreground">¿A dónde viajás?</label>
          <input
            value={destination}
            onChange={(e) => {
              setDestination(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Ej: Estambul, Turquía"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
          />
          {searching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground absolute right-3 top-[2.4rem]" />
          )}
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {suggestions.map((p) => (
                <li key={p.label}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      skipNextSearch.current = true;
                      setDestination(p.label);
                      setShowSuggestions(false);
                      setSuggestions([]);
                    }}
                    className="w-full text-left px-3 py-2.5 font-body text-sm text-foreground hover:bg-secondary/60 transition-colors flex items-center gap-2"
                  >
                    <Globe2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>{p.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-body font-semibold text-foreground">Desde</label>
            <input
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-body font-semibold text-foreground">Mes del viaje</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
            >
              <option value="">Seleccioná uno</option>
              {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-body font-semibold text-foreground">Tipo de viaje</label>
          <select
            value={tripType}
            onChange={(e) => setTripType(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
          >
            {TRIP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <Button className="w-full text-base py-6" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Preparando tu viaje...</span>
          ) : (
            <span className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Qué necesito para este viaje</span>
          )}
        </Button>
      </div>

      {result && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {result.destination_summary && (
            <div className="bg-gradient-to-br from-primary/10 to-secondary/40 border border-primary/20 rounded-xl p-4 space-y-1">
              <p className="text-xs font-body font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5" /> {resultDestination}
              </p>
              <p className="text-sm font-body text-foreground leading-relaxed">{result.destination_summary}</p>
            </div>
          )}

          {result.cultural_notes?.length > 0 && (
            <div className="bg-card rounded-xl p-5 shadow-card space-y-2">
              <h3 className="font-display font-bold text-foreground">Cómo se viste la gente allá</h3>
              <ul className="space-y-1.5">
                {result.cultural_notes.map((n, i) => (
                  <li key={i} className="text-sm font-body text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span><span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.avoid?.length > 0 && (
            <div className="bg-card rounded-xl p-5 shadow-card space-y-2">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Ban className="h-4 w-4 text-destructive" /> Mejor evitar
              </h3>
              <ul className="space-y-1.5">
                {result.avoid.map((n, i) => (
                  <li key={i} className="text-sm font-body text-muted-foreground flex gap-2">
                    <span className="text-destructive">•</span><span>{n}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.from_wardrobe?.length > 0 && (
            <div className="bg-card rounded-xl p-5 shadow-card space-y-2">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <Shirt className="h-4 w-4 text-primary" /> De tu placard te sirve
              </h3>
              <div className="space-y-2">
                {result.from_wardrobe.map((w, i) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/30 border border-border">
                    <p className="text-sm font-body font-medium text-foreground">{w.item}</p>
                    <ExplanationToggle label="Por qué"><p className="text-xs font-body text-muted-foreground">{w.reason}</p></ExplanationToggle>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.to_buy?.length > 0 && (
            <div className="bg-card rounded-xl p-5 shadow-card space-y-2">
              <h3 className="font-display font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-primary" /> Te falta comprar
              </h3>
              <div className="space-y-2">
                {result.to_buy.map((b, i) => (
                  <a
                    key={i}
                    href={getMLUrl(b.search_query)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/40 hover:bg-secondary/50 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 flex-1">
                        <p className="text-sm font-body font-medium text-foreground">{b.item}</p>
                        <ExplanationToggle label="Por qué"><p className="text-xs font-body text-muted-foreground">{b.reason}</p></ExplanationToggle>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 group-hover:text-primary transition-colors pt-0.5">
                        Comprar <ExternalLink className="h-3 w-3" />
                      </span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
