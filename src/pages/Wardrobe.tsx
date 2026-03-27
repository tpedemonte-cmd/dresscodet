import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import EditItemDialog from '@/components/EditItemDialog';

const CATEGORIES: Record<string, string> = {
  remera: '👕 Remera',
  pantalon: '👖 Pantalón',
  campera: '🧥 Campera',
  buzo: '🧶 Buzo',
  camisa: '👔 Camisa',
  short: '🩳 Short',
  vestido: '👗 Vestido',
  pollera: '💃 Pollera',
  zapatillas: '👟 Zapatillas',
  zapatos: '👞 Zapatos',
  accesorio: '🎒 Accesorio',
  otro: '📦 Otro',
};

export default function Wardrobe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['clothing_items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clothing_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clothing_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      toast.success('Prenda eliminada');
    },
  });

  const filtered = filter ? items.filter((i) => i.category === filter) : items;
  const categories = [...new Set(items.map((i) => i.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Tu Guardarropas</h2>
        <p className="text-muted-foreground font-body">{items.length} prendas</p>
      </div>

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
              !filter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                filter === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              {CATEGORIES[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">👕</p>
          <p className="text-muted-foreground font-body">
            {items.length === 0 ? 'Tu placard está vacío. ¡Agregá tu primera prenda!' : 'No hay prendas en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-shadow"
            >
              <div className="aspect-square">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-3">
                <p className="font-body font-medium text-sm text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">{CATEGORIES[item.category] || item.category}</p>
                {item.color && <p className="text-xs text-muted-foreground mt-0.5">{item.color}</p>}
              </div>
              <button
                onClick={() => setEditingItem(item)}
                className="absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
