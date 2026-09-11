import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Plane, Sparkles, Loader2, ExternalLink, Shirt, Ban, Globe2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

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
const ACTIVITIES = ['Templos / mezquitas / iglesias', 'Ciudad y museos', 'Trekking / naturaleza', 'Playa o pileta', 'Salidas de noche', 'Reuniones de trabajo'];
const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getMLUrl = (query: string) =>
  `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;

export default function Travel() {
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('Argentina');
  const [tripType, setTripType] = useState('Turismo');
  const [month, setMonth] = useState('');
  const [days, setDays] = useState('');
  const [activities, setActivities] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TravelResult | null>(null);

  const toggleActivity = (a: string) =>
    setActivities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));

  const handleGenerate = async () => {
    if (!destination.trim()) {
      toast.error('Contanos a dónde viajás');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('travel-wardrobe', {
        body: {
          destination: destination.trim(),
          origin,
          tripType,
          month,
          days: days ? Number(days) : null,
          activities,
          notes: notes.trim(),
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
        <div className="space-y-1.5">
          <label className="text-sm font-body font-semibold text-foreground">¿A dónde viajás?</label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ej: Estambul, Turquía"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
          />
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

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-body font-semibold text-foreground">Días</label>
            <input
              type="number"
              min="0"
              value={days}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '' || Number(v) >= 0) setDays(v);
              }}
              placeholder="10"
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
            />
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
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body font-semibold text-foreground">¿Qué vas a hacer?</label>
          <div className="flex flex-wrap gap-2">
            {ACTIVITIES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => toggleActivity(a)}
                className={`px-3 py-1.5 rounded-full text-sm font-body border transition-colors ${
                  activities.includes(a)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/30 text-muted-foreground border-border hover:border-primary/40'
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-body font-semibold text-foreground">Aclaraciones (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej: voy a visitar mezquitas y zonas rurales"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 font-body text-base"
          />
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
                <Globe2 className="h-3.5 w-3.5" /> {destination}
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
                    <p className="text-xs font-body text-muted-foreground">{w.reason}</p>
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
                        <p className="text-xs font-body text-muted-foreground">{b.reason}</p>
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
