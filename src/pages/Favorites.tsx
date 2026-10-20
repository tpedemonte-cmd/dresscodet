import ExplanationToggle from '@/components/ExplanationToggle';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Star, MapPin, CalendarDays, Sparkles, Loader2 } from 'lucide-react';
import OutfitFeedback from '@/components/OutfitFeedback';

const EVENTS: Record<string, string> = {
  trabajo: '💼 Trabajo',
  cita: '❤️ Cita',
  amigos: '🍻 Amigos',
  familia: '👨‍👩‍👧 Familia',
  fiesta: '🎉 Fiesta',
  gym: '🏋️ Gym',
  universidad: '📚 Universidad',
};

const WEATHERS: Record<string, string> = {
  soleado: '☀️ Soleado',
  nublado: '☁️ Nublado',
  lluvia: '🌧️ Lluvia',
  tormenta: '⛈️ Tormenta',
};

type FavOutfit = {
  source: 'outfit_history' | 'weekly_plans';
  id: string;
  recommendation: string;
  event: string;
  weather: string | null;
  weather_label?: string | null;
  temperature: number | null;
  recommended_item_ids: string[];
  date: string;
  location_name?: string | null;
  feedback?: string | null;
};

export default function Favorites() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [eventFilter, setEventFilter] = useState<string>('todos');
  const [weatherFilter, setWeatherFilter] = useState<string>('todos');

  const { data: items = [] } = useQuery({
    queryKey: ['clothing_items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clothing_items').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: history = [], isLoading: l1 } = useQuery({
    queryKey: ['favorites_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_history')
        .select('*')
        .eq('is_favorite', true as any)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: plans = [], isLoading: l2 } = useQuery({
    queryKey: ['favorites_plans', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_plans')
        .select('*')
        .eq('is_favorite', true as any)
        .order('plan_date', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const favorites: FavOutfit[] = useMemo(() => {
    const h = (history as any[]).map((r) => ({
      source: 'outfit_history' as const,
      id: r.id,
      recommendation: r.recommendation,
      event: r.event,
      weather: r.weather,
      temperature: r.temperature,
      recommended_item_ids: r.recommended_item_ids || [],
      date: r.created_at,
      feedback: r.feedback,
    }));
    const p = (plans as any[]).map((r) => ({
      source: 'weekly_plans' as const,
      id: r.id,
      recommendation: r.recommendation || '',
      event: r.event,
      weather: r.weather,
      weather_label: r.weather_label,
      temperature: r.temperature,
      recommended_item_ids: r.recommended_item_ids || [],
      date: r.plan_date,
      location_name: r.location_name,
      feedback: r.feedback,
    }));
    return [...h, ...p].sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [history, plans]);

  const filtered = favorites.filter((f) => {
    if (eventFilter !== 'todos' && f.event !== eventFilter) return false;
    if (weatherFilter !== 'todos' && f.weather !== weatherFilter) return false;
    return true;
  });

  const availableEvents = Array.from(new Set(favorites.map((f) => f.event))).filter(Boolean);
  const availableWeathers = Array.from(new Set(favorites.map((f) => f.weather))).filter(Boolean) as string[];

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['favorites_history', user?.id] });
    qc.invalidateQueries({ queryKey: ['favorites_plans', user?.id] });
  };

  if (l1 || l2) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Star className="h-6 w-6 fill-amber-400 text-amber-500" /> Outfits favoritos
        </h2>
        <p className="text-muted-foreground font-body">{favorites.length} guardados</p>
      </div>

      {favorites.length > 0 && (
        <div className="space-y-3 bg-card p-4 rounded-xl shadow-card">
          <div className="space-y-1.5">
            <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Salida</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={eventFilter === 'todos'} onClick={() => setEventFilter('todos')}>Todas</FilterChip>
              {availableEvents.map((e) => (
                <FilterChip key={e} active={eventFilter === e} onClick={() => setEventFilter(e)}>
                  {EVENTS[e] || e}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-body font-medium text-muted-foreground uppercase tracking-wide">Clima</p>
            <div className="flex flex-wrap gap-2">
              <FilterChip active={weatherFilter === 'todos'} onClick={() => setWeatherFilter('todos')}>Todos</FilterChip>
              {availableWeathers.map((w) => (
                <FilterChip key={w} active={weatherFilter === w} onClick={() => setWeatherFilter(w)}>
                  {WEATHERS[w] || w}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-card p-10 rounded-xl shadow-card text-center space-y-2">
          <Star className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="font-body text-muted-foreground">
            {favorites.length === 0
              ? 'Todavía no marcaste outfits como favoritos. Tocá la estrella en cualquier recomendación para guardarla acá.'
              : 'No hay favoritos con esos filtros.'}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((f) => {
            const usedItems = (items as any[]).filter((i) => f.recommended_item_ids.includes(i.id));
            return (
              <div key={`${f.source}-${f.id}`} className="bg-card p-5 rounded-xl shadow-card space-y-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="space-y-1">
                    <div className="text-base font-body font-semibold flex items-center gap-2">
                      {f.source === 'weekly_plans' ? <CalendarDays className="h-4 w-4 text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                      {EVENTS[f.event] || f.event}
                    </div>
                    {f.location_name && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {f.location_name}</div>
                    )}
                    <div className="text-xs text-muted-foreground">
                      {new Date(f.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {f.weather && <span className="px-2 py-1 rounded-md bg-secondary">{f.weather_label || WEATHERS[f.weather] || f.weather}</span>}
                    {f.temperature != null && <span className="px-2 py-1 rounded-md bg-secondary">🌡️ {f.temperature}°C</span>}
                  </div>
                </div>

                {f.recommendation && (
                  <ExplanationToggle><p className="text-sm font-body whitespace-pre-wrap text-foreground/90">{f.recommendation}</p></ExplanationToggle>
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

                <OutfitFeedback
                  table={f.source}
                  recordId={f.id}
                  initialFeedback={(f.feedback ?? null) as any}
                  initialFavorite={true}
                  onChange={refetch}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
    >
      {children}
    </button>
  );
}
