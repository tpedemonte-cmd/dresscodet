import IconText from '@/components/IconText';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { BarChart3, AlertTriangle, Star, Clock } from 'lucide-react';
import { analizarUsoPrendas, type ItemUsage } from '@/lib/wardrobeAnalysis';
import { useState } from 'react';

const CATEGORY_LABELS: Record<string, string> = {
  remera: '👕 Remera', pantalon: '👖 Pantalón', campera: '🧥 Campera',
  buzo: '🧶 Buzo', camisa: '👔 Camisa', short: '🩳 Short',
  vestido: '👗 Vestido', pollera: '💃 Pollera', zapatillas: '👟 Zapatillas',
  zapatos: '👞 Zapatos', medias: '🧦 Medias', accesorio: '🎒 Accesorio',
};

export default function Stats() {
  const { user } = useAuth();

  const { data: history = [] } = useQuery({
    queryKey: ['outfit_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_history' as any)
        .select('recommended_item_ids, created_at')
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

  // Count item usage
  const itemCount: Record<string, number> = {};
  history.forEach((h: any) => {
    (h.recommended_item_ids || []).forEach((id: string) => {
      itemCount[id] = (itemCount[id] || 0) + 1;
    });
  });

  const topItems = Object.entries(itemCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([id, count]) => ({ item: items.find((i) => i.id === id), count }))
    .filter((x) => x.item);

  // Count category usage
  const catCount: Record<string, number> = {};
  Object.entries(itemCount).forEach(([id, count]) => {
    const item = items.find((i) => i.id === id);
    if (item) catCount[item.category] = (catCount[item.category] || 0) + count;
  });

  const topCategories = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a);

  const maxCatCount = topCategories[0]?.[1] || 1;
  const maxItemCount = topItems[0]?.count || 1;

  // Usage analysis
  const usageAnalysis = analizarUsoPrendas(history, items);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const filteredAnalysis = statusFilter
    ? usageAnalysis.filter((u) => u.estado === statusFilter)
    : usageAnalysis;

  const olvidadas = usageAnalysis.filter((u) => u.estado === 'olvidada').length;
  const frecuentes = usageAnalysis.filter((u) => u.estado === 'frecuente').length;
  const pocoUsadas = usageAnalysis.filter((u) => u.estado === 'poco usada').length;

  const STATUS_STYLE: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    frecuente: { icon: <Star className="h-3.5 w-3.5" />, color: 'text-primary', bg: 'bg-primary/10' },
    'poco usada': { icon: <Clock className="h-3.5 w-3.5" />, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    olvidada: { icon: <AlertTriangle className="h-3.5 w-3.5" />, color: 'text-destructive', bg: 'bg-destructive/10' },
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Estadísticas</h2>
        <p className="text-muted-foreground font-body">{history.length} outfits generados</p>
      </div>

      {history.length === 0 && items.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl"><IconText text={"📊"} /></p>
          <p className="text-muted-foreground font-body">Pedí algunas recomendaciones para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          {/* Usage analysis summary */}
          {items.length > 0 && (
            <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><IconText text={"👗 Análisis de uso de prendas"} /></h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <button
                  onClick={() => setStatusFilter(statusFilter === 'frecuente' ? null : 'frecuente')}
                  className={`rounded-lg p-2 transition-colors ${statusFilter === 'frecuente' ? 'ring-2 ring-primary' : ''} bg-primary/10`}
                >
                  <p className="text-xl font-bold text-primary">{frecuentes}</p>
                  <p className="text-[10px] text-muted-foreground">Frecuentes</p>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'poco usada' ? null : 'poco usada')}
                  className={`rounded-lg p-2 transition-colors ${statusFilter === 'poco usada' ? 'ring-2 ring-amber-500' : ''} bg-amber-500/10`}
                >
                  <p className="text-xl font-bold text-amber-500">{pocoUsadas}</p>
                  <p className="text-[10px] text-muted-foreground">Poco usadas</p>
                </button>
                <button
                  onClick={() => setStatusFilter(statusFilter === 'olvidada' ? null : 'olvidada')}
                  className={`rounded-lg p-2 transition-colors ${statusFilter === 'olvidada' ? 'ring-2 ring-destructive' : ''} bg-destructive/10`}
                >
                  <p className="text-xl font-bold text-destructive">{olvidadas}</p>
                  <p className="text-[10px] text-muted-foreground">Olvidadas</p>
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredAnalysis.map((u) => {
                  const style = STATUS_STYLE[u.estado];
                  return (
                    <div key={u.itemId} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img src={u.imageUrl} alt={u.prenda} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-body font-medium text-foreground truncate">{u.prenda}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.usos} uso{u.usos !== 1 ? 's' : ''} · última vez: {u.ultimaVez ? new Date(u.ultimaVez).toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${style.bg} ${style.color}`}>
                        {style.icon}
                        {u.estado}
                      </span>
                    </div>
                  );
                })}
                {filteredAnalysis.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">Sin prendas en esta categoría</p>
                )}
              </div>
            </div>
          )}

          {/* Top categories */}
          {history.length > 0 && (
            <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
              <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Categorías más usadas
              </h3>
              <div className="space-y-2">
                {topCategories.map(([cat, count]) => (
                  <div key={cat} className="space-y-1">
                    <div className="flex justify-between text-sm font-body">
                      <span className="text-foreground"><IconText text={CATEGORY_LABELS[cat] || cat} /></span>
                      <span className="text-muted-foreground">{count}×</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(count / maxCatCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top items */}
          {topItems.length > 0 && (
            <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
              <h3 className="font-display font-semibold text-foreground"><IconText text={"🏆 Prendas más recomendadas"} /></h3>
              <div className="space-y-2">
                {topItems.map(({ item, count }, i) => (
                  <div key={item!.id} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                    <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      <img src={item!.image_url} alt={item!.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body font-medium text-foreground truncate">{item!.name}</p>
                      <p className="text-xs text-muted-foreground"><IconText text={CATEGORY_LABELS[item!.category] || item!.category} /></p>
                    </div>
                    <div className="flex-shrink-0">
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / maxItemCount) * 40 + 10}px` }} />
                        <span className="text-xs text-muted-foreground">{count}×</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
