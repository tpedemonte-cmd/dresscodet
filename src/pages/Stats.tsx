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
  zapatos: '👞 Zapatos', accesorio: '🎒 Accesorio',
};

export default function Stats() {
  const { user } = useAuth();

  const { data: history = [] } = useQuery({
    queryKey: ['outfit_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_history' as any)
        .select('recommended_item_ids')
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

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Estadísticas</h2>
        <p className="text-muted-foreground font-body">{history.length} outfits generados</p>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">📊</p>
          <p className="text-muted-foreground font-body">Pedí algunas recomendaciones para ver tus estadísticas.</p>
        </div>
      ) : (
        <>
          {/* Top categories */}
          <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Categorías más usadas
            </h3>
            <div className="space-y-2">
              {topCategories.map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-sm font-body">
                    <span className="text-foreground">{CATEGORY_LABELS[cat] || cat}</span>
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

          {/* Top items */}
          <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
            <h3 className="font-display font-semibold text-foreground">🏆 Prendas más recomendadas</h3>
            <div className="space-y-2">
              {topItems.map(({ item, count }, i) => (
                <div key={item!.id} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-muted-foreground w-5 text-right">{i + 1}</span>
                  <div className="h-10 w-10 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    <img src={item!.image_url} alt={item!.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body font-medium text-foreground truncate">{item!.name}</p>
                    <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[item!.category] || item!.category}</p>
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
        </>
      )}
    </div>
  );
}
