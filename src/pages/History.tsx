import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Sparkles, Trash2, ChevronDown, Star, ChevronLeft, ChevronRight, CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { format, isSameDay, isWithinInterval, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import OutfitFeedback from '@/components/OutfitFeedback';
import DeleteHistoryConfirmDialog from '@/components/DeleteHistoryConfirmDialog';

import { usePlan } from '@/lib/plan';
import { useNavigate } from 'react-router-dom';
import { Crown } from 'lucide-react';


const FORMALITY_LABELS: Record<string, string> = {
  casual: '😎 Casual', equilibrado: '⚖️ Equilibrado', formal: '🎩 Formal',
};
const MOOD_LABELS: Record<string, string> = {
  feliz: '😊 Feliz', relajado: '😌 Relajado/a', elegante: '✨ Elegante',
  casual: '😎 Casual', energetico: '⚡ Energético/a', romantico: '💕 Romántico/a',
};
const EVENT_LABELS: Record<string, string> = {
  trabajo: '💼 Trabajo', cita: '❤️ Cita', amigos: '🍻 Amigos',
  familia: '👨‍👩‍👧 Familia', fiesta: '🎉 Fiesta', gym: '🏋️ Gym',
  casual: '🏠 Casual', universidad: '📚 Uni',
};
const WEATHER_LABELS: Record<string, string> = {
  soleado: '☀️', nublado: '☁️', lluvia: '🌧️', tormenta: '⛈️',
};
const SEASON_LABELS: Record<string, string> = {
  verano: '🌞', otoño: '🍂', invierno: '❄️', primavera: '🌸',
};

export default function History() {
  const { user } = useAuth();
  const { isPremium, FREE_HISTORY_LIMIT } = usePlan();
  const navigatePremium = useNavigate();
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [eventFilter, setEventFilter] = useState<string>('todos');
  const [dateFilter, setDateFilter] = useState<'todas' | 'hoy' | 'semana' | 'mes' | 'personalizado'>('todas');
  const [feedbackFilter, setFeedbackFilter] = useState<'todos' | 'positivo' | 'negativo' | 'sin'>('todos');
  const [customStart, setCustomStart] = useState<Date | undefined>(undefined);
  const [customEnd, setCustomEnd] = useState<Date | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; event: string; created_at: string } | null>(null);
  const perPage = 10;

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['outfit_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_history' as any)
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: items = [] } = useQuery({
    queryKey: ['clothing_items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('clothing_items').select('*');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('outfit_history' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outfit_history'] });
      toast.success('Recomendación eliminada');
    },
  });

  const matchesDateFilter = (entry: any) => {
    if (dateFilter === 'todas') return true;
    const entryDate = new Date(entry.created_at);
    const now = new Date();
    if (dateFilter === 'hoy') return isSameDay(entryDate, now);
    if (dateFilter === 'semana') return isWithinInterval(entryDate, { start: startOfDay(subDays(now, 7)), end: endOfDay(now) });
    if (dateFilter === 'mes') return isWithinInterval(entryDate, { start: startOfMonth(now), end: endOfMonth(now) });
    if (dateFilter === 'personalizado' && customStart && customEnd) {
      return isWithinInterval(entryDate, { start: startOfDay(customStart), end: endOfDay(customEnd) });
    }
    return true;
  };

  const matchesFeedbackFilter = (entry: any) => {
    if (feedbackFilter === 'todos') return true;
    const fb = entry.feedback;
    if (feedbackFilter === 'sin') return !fb;
    if (feedbackFilter === 'positivo') return fb === 'liked' || fb === 'used';
    if (feedbackFilter === 'negativo') return fb === 'disliked' || fb === 'not_used';
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Historial de Outfits</h2>
        <p className="text-muted-foreground font-body">
          {history.length} recomendaciones
          {!isPremium && history.length > FREE_HISTORY_LIMIT && (
            <span className="text-sm"> · viendo las últimas {FREE_HISTORY_LIMIT} (plan gratis)</span>
          )}
        </p>
      </div>

      

      {isPremium && history.length > 0 && (() => {
        const availableEvents = Array.from(new Set(history.map((h: any) => h.event)));
        return (
          <div className="space-y-3">
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              <button
                onClick={() => { setEventFilter('todos'); setPage(1); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                  eventFilter === 'todos'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Todos
              </button>
              {availableEvents.map((ev) => (
                <button
                  key={ev}
                  onClick={() => { setEventFilter(ev); setPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                    eventFilter === ev
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {EVENT_LABELS[ev] || ev}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-body text-muted-foreground shrink-0"><CalendarIcon className="h-4 w-4 inline -mt-0.5 mr-1" /> Fecha:</span>
              {[
                { key: 'todas', label: 'Todas' },
                { key: 'hoy', label: 'Hoy' },
                { key: 'semana', label: 'Últ. 7 días' },
                { key: 'mes', label: 'Este mes' },
                { key: 'personalizado', label: 'Personalizado' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setDateFilter(opt.key as any); setPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                    dateFilter === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {dateFilter === 'personalizado' && (
              <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl shadow-card">
                <DatePicker label="Desde" date={customStart} setDate={(d) => { setCustomStart(d); setPage(1); }} />
                <span className="text-sm text-muted-foreground font-body">—</span>
                <DatePicker label="Hasta" date={customEnd} setDate={(d) => { setCustomEnd(d); setPage(1); }} />
                {(customStart || customEnd) && (
                  <button
                    onClick={() => { setCustomStart(undefined); setCustomEnd(undefined); setPage(1); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-body"
                  >
                    <X className="h-3 w-3" /> Limpiar
                  </button>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-body text-muted-foreground shrink-0">Feedback:</span>
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'positivo', label: '👍 Me gustó / Lo usé' },
                { key: 'negativo', label: '👎 No me gustó / No lo usaría' },
                { key: 'sin', label: 'Sin feedback' },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setFeedbackFilter(opt.key as any); setPage(1); }}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-body transition-colors ${
                    feedbackFilter === opt.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        );
      })()}

      {history.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">📋</p>
          <p className="text-muted-foreground font-body">Todavía no pediste ninguna recomendación.</p>
        </div>
      ) : (() => {
        const allFiltered = history
          .filter((h: any) => eventFilter === 'todos' || h.event === eventFilter)
          .filter((h: any) => matchesDateFilter(h))
          .filter((h: any) => matchesFeedbackFilter(h));
        const filtered = isPremium ? allFiltered : allFiltered.slice(0, FREE_HISTORY_LIMIT);
        const hiddenCount = allFiltered.length - filtered.length;
        if (filtered.length === 0) {
          return (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">🔍</p>
              <p className="text-muted-foreground font-body text-sm">No hay recomendaciones para este tipo de salida o fecha.</p>
            </div>
          );
        }
        const totalPages = Math.ceil(filtered.length / perPage);
        const safePage = Math.min(page, totalPages);
        const paginated = filtered.slice((safePage - 1) * perPage, safePage * perPage);
        return (
        <div className="space-y-3">
          {paginated.map((entry: any) => {
            const isExpanded = expandedId === entry.id;
            const entryItems = items.filter((i) =>
              (entry.recommended_item_ids || []).includes(i.id)
            );
            const date = new Date(entry.created_at);

            return (
              <div key={entry.id} className="bg-card rounded-xl shadow-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-body font-medium text-foreground">
                        {EVENT_LABELS[entry.event] || entry.event}
                      </span>
                      {entry.is_favorite && <Star className="h-3.5 w-3.5 text-amber-500 fill-current" />}

                      {entry.formality && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {FORMALITY_LABELS[entry.formality] || entry.formality}
                          </span>
                        </>
                      )}
                      {!entry.formality && entry.mood && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {MOOD_LABELS[entry.mood] || entry.mood}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {entry.temperature}°C {WEATHER_LABELS[entry.weather] || ''} {SEASON_LABELS[entry.season] || ''}
                        {entry.is_night ? ' 🌙' : ''}
                      </span>
                      {entry.wind_kmh != null && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">💨 {entry.wind_kmh} km/h</span>
                        </>
                      )}
                      {entry.rain_probability != null && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">🌧️ {entry.rain_probability}%</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-body">
                      {date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                    <div className="font-body text-foreground whitespace-pre-line leading-relaxed text-sm">
                      {entry.recommendation}
                    </div>
                    {entryItems.length > 0 && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs font-body font-medium text-muted-foreground mb-2">Prendas:</p>
                        <div className="grid grid-cols-4 gap-2">
                          {entryItems.map((item) => (
                            <div key={item.id} className="rounded-lg overflow-hidden bg-secondary">
                              <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover" />
                              <p className="text-[10px] font-body text-center py-0.5 text-foreground truncate px-1">{item.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <OutfitFeedback
                      table="outfit_history"
                      recordId={entry.id}
                      initialFeedback={entry.feedback ?? null}
                      initialFavorite={!!entry.is_favorite}
                      onChange={() => {
                        queryClient.invalidateQueries({ queryKey: ['outfit_history'] });
                        queryClient.invalidateQueries({ queryKey: ['favorites'] });
                      }}
                    />
                    <button
                      onClick={() => setEntryToDelete({ id: entry.id, event: entry.event, created_at: entry.created_at })}
                      className="flex items-center gap-1 text-xs text-destructive hover:underline font-body"
                    >
                      <Trash2 className="h-3 w-3" /> Eliminar
                    </button>

                  </div>
                )}
              </div>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-body text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80"
              >
                <ChevronLeft className="h-4 w-4" /> Anteriores
              </button>
              <span className="text-sm font-body text-muted-foreground">
                Página {safePage} de {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-body text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary/80"
              >
                Siguientes <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {hiddenCount > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2 shadow-card">
              <p className="text-sm font-body font-medium text-foreground">
                Hay {hiddenCount} recomendaciones más en tu historial
              </p>
              <p className="text-xs font-body text-muted-foreground">
                El plan gratis muestra solo las últimas {FREE_HISTORY_LIMIT}. Con Premium ves todo tu historial completo.
              </p>
              <Button variant="warm" size="sm" onClick={() => navigatePremium('/premium')}>
                <Crown className="h-4 w-4 mr-2" /> Ver todo con Premium
              </Button>
            </div>
          )}
        </div>
        );
      })()}

      <DeleteHistoryConfirmDialog
        entry={entryToDelete}
        open={!!entryToDelete}
        onOpenChange={(open) => {
          if (!open) setEntryToDelete(null);
        }}
        onConfirm={() => {
          if (entryToDelete) {
            deleteMutation.mutate(entryToDelete.id);
            setEntryToDelete(null);
          }
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}

function DatePicker({ label, date, setDate }: { label: string; date: Date | undefined; setDate: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-[150px] justify-start text-left font-normal text-sm font-body',
            !date && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'dd/MM/yyyy', { locale: es }) : <span>{label}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          initialFocus
          className={cn('p-3 pointer-events-auto')}
        />
      </PopoverContent>
    </Popover>
  );
}
