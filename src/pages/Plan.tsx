import ExplanationToggle from '@/components/ExplanationToggle';
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { usePlan } from '@/lib/plan';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ExternalLink, Loader2, Lock, MapPin, Plus, Search, ShoppingBag, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { fetchForecastForDate, searchCity, type GeoResult } from '@/lib/weather';
import OutfitFeedback from '@/components/OutfitFeedback';
import { isAvailable } from '@/lib/availability';
import PremiumGate from '@/components/PremiumGate';

const EVENTS = [
  { value: 'trabajo', label: '💼 Trabajo' },
  { value: 'cita', label: '❤️ Cita' },
  { value: 'amigos', label: '🍻 Juntada con amigos' },
  { value: 'familia', label: '👨‍👩‍👧 Familia' },
  { value: 'fiesta', label: '🎉 Fiesta' },
  { value: 'gym', label: '🏋️ Gym / Deporte' },
  { value: 'universidad', label: '📚 Universidad' },
];

const FORMALITY = [
  { value: 'casual', label: '😎 Casual' },
  { value: 'equilibrado', label: '✨ Equilibrado' },
  { value: 'formal', label: '🎩 Formal' },
];

function todayISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function maxDateISO() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
function formatDateLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function Plan() {
  const { user } = useAuth();
  const { isPremium, loading: planLoading } = usePlan();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [planDate, setPlanDate] = useState(todayISO());
  const [planTime, setPlanTime] = useState('');
  const [showExactTime, setShowExactTime] = useState(false);
  const [event, setEvent] = useState('');
  const [formality, setFormality] = useState('equilibrado');
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<GeoResult[]>([]);
  const [searchingCity, setSearchingCity] = useState(false);
  const [selectedCity, setSelectedCity] = useState<GeoResult | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['weekly_plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans' as any)
        .select('*')
        .gte('plan_date', todayISO())
        .order('plan_date', { ascending: true })
        .order('plan_time', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && isPremium,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['clothing_items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clothing_items').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user && isPremium,
  });

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('wishlist').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user && isPremium,
  });

  // Búsqueda de ciudad con debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!cityQuery.trim() || selectedCity) {
      setCityResults([]);
      return;
    }
    debounceRef.current = window.setTimeout(async () => {
      setSearchingCity(true);
      try {
        const results = await searchCity(cityQuery);
        setCityResults(results);
      } finally {
        setSearchingCity(false);
      }
    }, 350);
  }, [cityQuery, selectedCity]);

  const resetForm = () => {
    setShowForm(false);
    setPlanDate(todayISO());
    setPlanTime('');
    setEvent('');
    setFormality('equilibrado');
    setCityQuery('');
    setCityResults([]);
    setSelectedCity(null);
  };

  const handleCreate = async () => {
    if (!user) return;
    if (!isPremium) return toast.error('El plan semanal es para Premium');
    if (!event) return toast.error('Elegí el tipo de salida');
    if (!selectedCity) return toast.error('Elegí una ciudad');
    if (items.length === 0) return toast.error('Primero agregá prendas a tu placard');

    setSubmitting(true);
    try {
      // 1. Pronóstico
      const forecast = await fetchForecastForDate(
        selectedCity.latitude,
        selectedCity.longitude,
        planDate,
        planTime || undefined
      );

      // 2. IA
      const wardrobeSummary = (items as any[]).filter((i) => isAvailable(i)).map(i =>
        `- ID:${i.id} | ${i.name} (${i.category}${i.color ? ', ' + i.color : ''})${i.is_favorite ? ' ⭐ FAVORITA' : ''}`
      ).join('\n');
      const wishlistSummary = (wishlistItems as any[]).length > 0
        ? (wishlistItems as any[]).map((w: any) => `- ID:${w.id} | ${w.title}`).join('\n')
        : '';

      const weatherForAI = forecast.weather === 'despejado-noche' ? 'soleado' : forecast.weather;
      const { data, error } = await supabase.functions.invoke('recommend-outfit', {
        body: {
          wardrobe: wardrobeSummary,
          wishlist: wishlistSummary,
          event,
          formality,
          temperature: forecast.temperature,
          weather: weatherForAI,
          season: forecast.season,
          windKmh: forecast.windKmh,
          rainProbability: forecast.precipitationProbability,
          isNight: forecast.weather === 'despejado-noche',
        },
      });
      if (error) { toast.error('La IA no está disponible en este momento. Probá de nuevo más tarde.'); return; }

      const fullText: string = data.recommendation || '';
      const itemsMatch = fullText.match(/ITEMS_USADOS:\s*(.+)/i);
      const cleanText = fullText
        .replace(/\n?ITEMS_USADOS:.+/i, '')
        .replace(/\n?WISHLIST_USADOS:.+/i, '')
        .replace(/\n?COMPRAR:.+/i, '')
        .trim();
      let usedItemIds: string[] = [];
      if (itemsMatch && itemsMatch[1].trim() !== 'ninguno') {
        usedItemIds = itemsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      }

      // Parse WISHLIST_USADOS
      let usedWishlistIds: string[] = [];
      const wishlistMatch = fullText.match(/WISHLIST_USADOS:\s*(.+)/i);
      if (wishlistMatch && wishlistMatch[1].trim().toLowerCase() !== 'ninguno') {
        usedWishlistIds = wishlistMatch[1].split(',').map(s => s.trim()).filter(Boolean);
      }

      // Parse COMPRAR y resolver URLs de Mercado Libre
      let shoppingSuggestions: { query: string; searchUrl: string }[] = [];
      const buyMatch = fullText.match(/COMPRAR:\s*(.+)/i);
      if (buyMatch && buyMatch[1].trim().toLowerCase() !== 'nada') {
        const queries = buyMatch[1].split('|').map(q => q.trim()).filter(Boolean);
        const results = await Promise.all(queries.map(async (q) => {
          try {
            const { data: sd } = await supabase.functions.invoke('search-marketplace', { body: { query: q } });
            return { query: q, searchUrl: sd?.searchUrl || `https://listado.mercadolibre.com.ar/${encodeURIComponent(q.replace(/ /g, '-'))}` };
          } catch {
            return { query: q, searchUrl: `https://listado.mercadolibre.com.ar/${encodeURIComponent(q.replace(/ /g, '-'))}` };
          }
        }));
        shoppingSuggestions = results;
      }

      // 3. Guardar
      const cityLabel = [selectedCity.name, selectedCity.admin1].filter(Boolean).join(', ');
      const { error: insertError } = await supabase.from('weekly_plans' as any).insert({
        user_id: user.id,
        plan_date: planDate,
        plan_time: planTime || null,
        event,
        formality,
        location_name: cityLabel,
        latitude: selectedCity.latitude,
        longitude: selectedCity.longitude,
        temperature: forecast.temperature,
        weather: weatherForAI,
        weather_label: forecast.weatherLabel,
        season: forecast.season,
        wind_kmh: forecast.windKmh,
        rain_probability: forecast.precipitationProbability,
        is_night: forecast.weather === 'despejado-noche',
        recommendation: cleanText,
        recommended_item_ids: usedItemIds,
        recommended_wishlist_ids: usedWishlistIds,
        shopping_suggestions: shoppingSuggestions,
      });
      if (insertError) throw insertError;

      toast.success('Outfit generado para tu salida ✨');
      qc.invalidateQueries({ queryKey: ['weekly_plans', user.id] });
      resetForm();
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes('402')) toast.error('Créditos agotados.');
      else if (err?.message?.includes('429')) toast.error('Demasiadas solicitudes, intentá de nuevo en un momento');
      else toast.error(err?.message || 'No pudimos generar el outfit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('weekly_plans' as any).delete().eq('id', id);
    if (error) return toast.error('No se pudo eliminar');
    toast.success('Salida eliminada');
    qc.invalidateQueries({ queryKey: ['weekly_plans', user?.id] });
  };

  const grouped = (plans as any[]).reduce<Record<string, any[]>>((acc, p) => {
    (acc[p.plan_date] = acc[p.plan_date] || []).push(p);
    return acc;
  }, {});

  if (planLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isPremium) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-body font-semibold text-primary">
            <Lock className="h-3.5 w-3.5" /> Premium
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground">Plan semanal</h2>
          <p className="text-muted-foreground font-body">Tus salidas, tu placard y el clima preparados antes de salir.</p>
        </div>

        <PremiumGate
          title="Planificá la semana con outfits listos"
          description="Premium arma cada salida con fecha, hora, ciudad, clima y prendas exactas de tu placard."
          benefits={['Outfits por día y horario', 'Clima real del lugar', 'Compras sugeridas si falta algo']}
          actionLabel="Activar Plan semanal"
        />

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { title: 'Lunes · Trabajo', text: 'Outfit formal con abrigo liviano según temperatura.' },
            { title: 'Miércoles · Cita', text: 'Look equilibrado con tus prendas favoritas.' },
            { title: 'Sábado · Fiesta', text: 'Qué ponerte y qué comprar si falta una pieza.' },
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Plan semanal</h2>
          <p className="text-muted-foreground font-body">Cargá tus salidas y armamos un outfit para cada una con el clima del lugar.</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Nueva salida
          </Button>
        )}
      </div>

      {showForm && (
        <div className="bg-card p-6 rounded-xl shadow-card space-y-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold">Nueva salida</h3>
            <Button variant="ghost" size="icon" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Día</Label>
              <Input type="date" value={planDate} min={todayISO()} max={maxDateISO()} onChange={(e) => setPlanDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora (opcional)</Label>
              {(() => {
                const isToday = planDate === todayISO();
                const QUICK = [
                  ...(isToday ? [{ key: 'ahora', label: 'Ahora', getTime: () => {
                    const d = new Date();
                    return `${String(d.getHours()).padStart(2, '0')}:${String(Math.floor(d.getMinutes() / 15) * 15).padStart(2, '0')}`;
                  }}] : []),
                  { key: 'manana', label: 'Mañana', time: '10:00' },
                  { key: 'tarde', label: 'Tarde', time: '16:00' },
                  { key: 'noche', label: 'Noche', time: '21:00' },
                ] as any[];
                const isQuickActive = (q: any) => {
                  if (!planTime || showExactTime) return false;
                  const t = q.time ?? q.getTime();
                  return planTime === t;
                };
                return (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {QUICK.map((q: any) => (
                        <Button
                          key={q.key}
                          type="button"
                          size="sm"
                          variant={isQuickActive(q) ? 'default' : 'outline'}
                          onClick={() => {
                            setShowExactTime(false);
                            setPlanTime(q.time ?? q.getTime());
                          }}
                        >
                          {q.label}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant={showExactTime ? 'default' : 'outline'}
                        onClick={() => setShowExactTime((v) => !v)}
                      >
                        Hora exacta
                      </Button>
                      {planTime && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => { setPlanTime(''); setShowExactTime(false); }}>
                          Limpiar
                        </Button>
                      )}
                    </div>
                    {showExactTime && (
                      <div className="flex gap-2 items-center pt-2">
                        <Select
                          value={planTime ? planTime.split(':')[0] : ''}
                          onValueChange={(h) => {
                            const m = planTime ? planTime.split(':')[1] : '00';
                            setPlanTime(`${h}:${m}`);
                          }}
                        >
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Hora" /></SelectTrigger>
                          <SelectContent className="max-h-64">
                            {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map((h) => (
                              <SelectItem key={h} value={h}>{h} hs</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={planTime ? planTime.split(':')[1] : ''}
                          onValueChange={(m) => {
                            const h = planTime ? planTime.split(':')[0] : '12';
                            setPlanTime(`${h}:${m}`);
                          }}
                          disabled={!planTime}
                        >
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Min" /></SelectTrigger>
                          <SelectContent>
                            {['00', '15', '30', '45'].map((m) => (
                              <SelectItem key={m} value={m}>:{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {planTime && (
                      <p className="text-xs text-muted-foreground">Hora seleccionada: <span className="font-semibold">{planTime} hs</span> · ajusta el clima a ese momento.</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de salida</Label>
            <Select value={event} onValueChange={setEvent}>
              <SelectTrigger><SelectValue placeholder="¿A dónde vas?" /></SelectTrigger>
              <SelectContent>
                {EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Estilo</Label>
            <div className="grid grid-cols-3 gap-2">
              {FORMALITY.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormality(f.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-body transition-colors ${
                    formality === f.value ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border hover:bg-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Ciudad de la salida</Label>
            {selectedCity ? (
              <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/40">
                <span className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4" /> {[selectedCity.name, selectedCity.admin1, selectedCity.country].filter(Boolean).join(', ')}</span>
                <Button variant="ghost" size="sm" onClick={() => { setSelectedCity(null); setCityQuery(''); }}>Cambiar</Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Ej: Palermo, Buenos Aires"
                    value={cityQuery}
                    onChange={(e) => setCityQuery(e.target.value)}
                  />
                </div>
                {(cityResults.length > 0 || searchingCity) && (
                  <div className="absolute z-20 left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                    {searchingCity && (
                      <div className="px-3 py-2 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Buscando...</div>
                    )}
                    {cityResults.map((r, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setSelectedCity(r); setCityResults([]); setCityQuery(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent"
                      >
                        <span className="font-medium">{r.name}</span>
                        <span className="text-muted-foreground"> — {[r.admin1, r.country].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={submitting} className="gap-2 flex-1">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {submitting ? 'Generando outfit...' : 'Crear y generar outfit'}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={submitting}>Cancelar</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="bg-card p-10 rounded-xl shadow-card text-center space-y-2">
          <Calendar className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-body text-muted-foreground">No tenés salidas planificadas. Agregá la primera.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayPlans]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-lg font-display font-semibold capitalize text-foreground">{formatDateLabel(date)}</h3>
              <div className="space-y-3">
                {dayPlans.map((p) => {
                  const usedItems = (items as any[]).filter(i => (p.recommended_item_ids || []).includes(i.id));
                  const usedWishlist = (wishlistItems as any[]).filter((w: any) => (p.recommended_wishlist_ids || []).includes(w.id));
                  const eventLabel = EVENTS.find(e => e.value === p.event)?.label || p.event;
                  return (
                    <div key={p.id} className="bg-card p-5 rounded-xl shadow-card space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <div className="text-base font-body font-semibold">{eventLabel}{p.plan_time && <span className="text-muted-foreground font-normal"> · {p.plan_time}</span>}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {p.location_name}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 rounded-md bg-secondary">{p.weather_label || p.weather}</span>
                        <span className="px-2 py-1 rounded-md bg-secondary">🌡️ {p.temperature}°C</span>
                        {p.wind_kmh != null && <span className="px-2 py-1 rounded-md bg-secondary">💨 {p.wind_kmh} km/h</span>}
                        {p.rain_probability != null && <span className="px-2 py-1 rounded-md bg-secondary">🌧️ {p.rain_probability}%</span>}
                      </div>

                      {p.recommendation && (
                        <ExplanationToggle><p className="text-sm font-body whitespace-pre-wrap text-foreground/90">{p.recommendation}</p></ExplanationToggle>
                      )}

                      {usedItems.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {usedItems.map((it) => (
                            <div key={it.id} className="flex-shrink-0 w-20 text-center">
                              <div className="aspect-square rounded-lg overflow-hidden bg-secondary">
                                <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                              </div>
                              <p className="text-[10px] mt-1 truncate">{it.name}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {usedWishlist.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <p className="text-sm font-body font-medium text-muted-foreground">🛒 De tu wishlist (todavía no lo tenés):</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {usedWishlist.map((w: any) => (
                              <a
                                key={w.id}
                                href={w.permalink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0 w-20 text-center group"
                              >
                                <div className="aspect-square rounded-lg overflow-hidden bg-secondary/50 border border-dashed border-primary/30 group-hover:border-primary transition-colors">
                                  <img src={w.image || w.thumbnail} alt={w.title} className="w-full h-full object-contain" />
                                </div>
                                <p className="text-[10px] mt-1 truncate">{w.title}</p>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {Array.isArray(p.shopping_suggestions) && p.shopping_suggestions.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                            <ShoppingBag className="h-4 w-4 text-primary" />
                            Te recomendamos comprar
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2">
                            {p.shopping_suggestions.map((s: any, i: number) => (
                              <a
                                key={i}
                                href={s.searchUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border hover:border-primary/40 hover:bg-secondary/60 transition-all group"
                              >
                                <span className="text-sm font-body text-foreground">{s.query}</span>
                                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 group-hover:text-primary transition-colors">
                                  Buscar <ExternalLink className="h-3 w-3" />
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <OutfitFeedback
                        table="weekly_plans"
                        recordId={p.id}
                        initialFeedback={(p.feedback ?? null) as any}
                        initialFavorite={!!p.is_favorite}
                        onChange={() => qc.invalidateQueries({ queryKey: ['weekly_plans', user?.id] })}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
