import IconText from '@/components/IconText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, Pencil, Heart, ChevronDown, Check, Share2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { prepareImageShare } from '@/lib/shareImages';
import { toast } from 'sonner';
import { useState } from 'react';
import EditItemDialog from '@/components/EditItemDialog';
import ItemLightbox from '@/components/ItemLightbox';
import DeleteItemConfirmDialog from '@/components/DeleteItemConfirmDialog';
import ClassifySubcategoriesButton from '@/components/ClassifySubcategoriesButton';
import { AVAILABILITY_OPTIONS, getAvailability, type Availability } from '@/lib/availability';
import { getSubcategories, getSubcategoryLabel } from '@/lib/subcategories';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';





const CATEGORIES: Record<string, string> = {
  remera: '👕 Remera',
  pantalon: '👖 Pantalón',
  campera: '🧥 Campera',
  buzo: '🧶 Buzo',
  sweater: '🥼 Sweater',
  camisa: '👔 Camisa',
  short: '🩳 Short',
  vestido: '👗 Vestido',
  pollera: '💃 Pollera',
  zapatillas: '👟 Zapatillas',
  zapatos: '👞 Zapatos',
  medias: '🧦 Medias',
  accesorio: '🎒 Accesorio',
  otro: '📦 Otro',
};

export default function Wardrobe() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [availFilter, setAvailFilter] = useState<Availability | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [zoomItem, setZoomItem] = useState<{ image_url: string; name: string } | null>(null);
  const [deleteRefs, setDeleteRefs] = useState({ history: 0, plans: 0 });
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharingId, setSharingId] = useState<string | null>(null);

  const shareItems = async (list: { image_url: string; name: string; category?: string }[], key: string) => {
    if (list.length === 0 || sharingId) return;
    setSharingId(key);
    try {
      const prepared = await prepareImageShare(
        list.map((i) => ({ url: i.image_url, name: i.name && /[a-z0-9]/i.test(i.name) ? i.name : (i.category ?? 'prenda') })),
        list.length === 1 ? list[0].name : 'Mis prendas',
      );
      const finish = (result: string) => {
        if (result === 'downloaded') {
          toast.success(
            prepared.files.length === 1
              ? 'Se descargó la imagen. Adjuntala a tu mail o mensaje.'
              : `Se descargaron ${prepared.files.length} imágenes separadas. Adjuntalas a tu mail o mensaje.`,
          );
        }
        if (result !== 'cancelled' && key === 'seleccion') {
          setSelecting(false);
          setSelectedIds(new Set());
        }
      };
      try {
        finish(await prepared.share());
      } catch (err) {
        if ((err as { name?: string })?.name === 'NotAllowedError') {
          toast('Las imágenes están listas', {
            action: { label: 'Compartir', onClick: () => { prepared.share().then(finish).catch(() => toast.error('No se pudo compartir')); } },
            duration: 15000,
          });
        } else {
          throw err;
        }
      }
    } catch {
      toast.error('No se pudieron compartir las imágenes');
    } finally {
      setSharingId(null);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };


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

      // Quitar la prenda eliminada de las recomendaciones del historial
      const { data: historyRefs } = await supabase
        .from('outfit_history')
        .select('id, recommended_item_ids')
        .contains('recommended_item_ids', [id]);
      for (const entry of historyRefs ?? []) {
        const newIds = (entry.recommended_item_ids ?? []).filter((i) => i !== id);
        await supabase.from('outfit_history').update({ recommended_item_ids: newIds }).eq('id', entry.id);
      }

      // Quitarla también de los planes semanales
      const { data: planRefs } = await supabase
        .from('weekly_plans')
        .select('id, recommended_item_ids')
        .contains('recommended_item_ids', [id]);
      for (const plan of planRefs ?? []) {
        const newIds = (plan.recommended_item_ids ?? []).filter((i) => i !== id);
        await supabase.from('weekly_plans').update({ recommended_item_ids: newIds }).eq('id', plan.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      queryClient.invalidateQueries({ queryKey: ['outfit_history'] });
      queryClient.invalidateQueries({ queryKey: ['weekly_plans'] });
      toast.success('Prenda eliminada');
      setIsConfirmOpen(false);
      setItemToDelete(null);
      setDeleteRefs({ history: 0, plans: 0 });
    },

  });

  const favMutation = useMutation({
    mutationFn: async ({ id, is_favorite }: { id: string; is_favorite: boolean }) => {
      const { error } = await supabase.from('clothing_items').update({ is_favorite } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clothing_items'] }),
  });

  const availabilityMutation = useMutation({
    mutationFn: async ({ id, availability }: { id: string; availability: Availability }) => {
      const { error } = await supabase.from('clothing_items').update({ availability } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      toast.success(`Estado actualizado: ${getAvailability(v.availability).label}`);
    },
    onError: () => toast.error('No se pudo actualizar el estado'),
  });

  const prepareDelete = async (item: any) => {
    const { count: historyCount } = await supabase
      .from('outfit_history')
      .select('*', { count: 'exact', head: true })
      .contains('recommended_item_ids', [item.id]);

    const { count: planCount } = await supabase
      .from('weekly_plans')
      .select('*', { count: 'exact', head: true })
      .contains('recommended_item_ids', [item.id]);

    setItemToDelete(item);
    setDeleteRefs({ history: historyCount ?? 0, plans: planCount ?? 0 });
    setIsConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate(itemToDelete.id);
    }
  };

  const filtered = items.filter(
    (i) =>
      (!filter || i.category === filter) &&
      (!subFilter || (subFilter === '__none__' ? !(i as any).subcategory : (i as any).subcategory === subFilter)) &&
      (!availFilter || ((i as any).availability ?? 'disponible') === availFilter)
  );

  const categories = [...new Set(items.map((i) => i.category))];

  // Subtipos presentes en el placard (filtrados por categoría si hay una elegida)
  const subPool = filter ? items.filter((i) => i.category === filter) : items;
  const presentSubs = new Set(subPool.map((i: any) => i.subcategory).filter(Boolean) as string[]);
  const subOptions = filter
    ? getSubcategories(filter).filter((o) => presentSubs.has(o.value))
    : Array.from(presentSubs).map((v) => ({ value: v, label: getSubcategoryLabel(null, v) || v }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">Tu Guardarropas</h2>
          <p className="text-muted-foreground font-body">{items.length} prendas</p>
        </div>
        {items.length > 0 && !selecting && (
          <Button variant="outline" size="sm" onClick={() => { setSelecting(true); setSelectedIds(new Set()); }}>
            <Share2 className="h-4 w-4" /> Compartir
          </Button>
        )}
      </div>

      {selecting && (
        <div className="sticky top-[4.5rem] z-40 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur-sm">
          <p className="mr-auto text-sm font-body text-foreground">
            {selectedIds.size === 0 ? 'Tocá las prendas que querés compartir' : `${selectedIds.size} seleccionada${selectedIds.size === 1 ? '' : 's'}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allSelected = filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id));
              setSelectedIds(allSelected ? new Set() : new Set(filtered.map((i) => i.id)));
            }}
          >
            {filtered.length > 0 && filtered.every((i) => selectedIds.has(i.id)) ? 'Quitar todas' : 'Seleccionar todas'}
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size === 0 || !!sharingId}
            onClick={() => shareItems(items.filter((i) => selectedIds.has(i.id)), 'seleccion')}
          >
            {sharingId === 'seleccion' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Compartir{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cancelar" onClick={() => { setSelecting(false); setSelectedIds(new Set()); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ClassifySubcategoriesButton items={items as any} />

      {categories.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { setFilter(null); setSubFilter(null); }}
            className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
              !filter ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            Todas
          </button>
          {categories.map((cat) => {
            const presentSubsForCat = new Set(
              items.filter((i) => i.category === cat).map((i: any) => i.subcategory).filter(Boolean) as string[]
            );
            const subsForCat = getSubcategories(cat);
            const isActive = filter === cat;

            if (subsForCat.length === 0) {
              return (
                <button
                  key={cat}
                  onClick={() => { setFilter(cat); setSubFilter(null); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                    isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <IconText text={CATEGORIES[cat] || cat} />
                </button>
              );
            }

            return (
              <DropdownMenu key={cat}>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                      isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    <IconText text={isActive && subFilter
                      ? `${CATEGORIES[cat] || cat} · ${subFilter === '__none__' ? 'Sin clasificar' : getSubcategoryLabel(cat, subFilter)}`
                      : CATEGORIES[cat] || cat} />
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover z-50">
                  <DropdownMenuItem onClick={() => { setFilter(cat); setSubFilter(null); }}>
                    <span className="flex-1">Todas</span>
                    {isActive && !subFilter && <Check className="h-3.5 w-3.5 ml-2" />}
                  </DropdownMenuItem>
                  {subsForCat.map((o) => {
                    const hasItems = presentSubsForCat.has(o.value);
                    return (
                      <DropdownMenuItem
                        key={o.value}
                        disabled={!hasItems}
                        onClick={() => { setFilter(cat); setSubFilter(o.value); }}
                        className={hasItems ? '' : 'opacity-50'}
                      >
                        <span className="flex-1">{o.label}</span>
                        {isActive && subFilter === o.value && <Check className="h-3.5 w-3.5 ml-2" />}
                      </DropdownMenuItem>
                    );
                  })}
                  {items.some((i) => i.category === cat && !(i as any).subcategory) && (
                    <DropdownMenuItem onClick={() => { setFilter(cat); setSubFilter('__none__'); }}>
                      <span className="flex-1 italic">Sin clasificar</span>
                      {isActive && subFilter === '__none__' && <Check className="h-3.5 w-3.5 ml-2" />}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>
      )}


      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setAvailFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
            !availFilter ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground'
          }`}
        >
          Todos los estados
        </button>
        {AVAILABILITY_OPTIONS.map((o) => {
          const count = items.filter((i) => ((i as any).availability ?? 'disponible') === o.value).length;
          if (count === 0 && o.value !== 'disponible') return null;
          return (
            <button
              key={o.value}
              onClick={() => setAvailFilter(availFilter === o.value ? null : o.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-body font-medium transition-colors ${
                availFilter === o.value ? 'bg-foreground text-background' : 'bg-secondary text-secondary-foreground'
              }`}
            >
              <IconText text={o.emoji} /> {o.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl"><IconText text={"👕"} /></p>
          <p className="text-muted-foreground font-body">
            {items.length === 0 ? 'Tu placard está vacío. ¡Agregá tu primera prenda!' : 'No hay prendas en esta categoría.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`group relative bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-shadow ${selecting && selectedIds.has(item.id) ? 'ring-2 ring-primary' : ''}`}
            >
              <div className="aspect-square relative">
                <button
                  type="button"
                  aria-label={selecting ? `Seleccionar ${item.name}` : `Ver ${item.name} en pantalla completa`}
                  aria-pressed={selecting ? selectedIds.has(item.id) : undefined}
                  onClick={() => selecting ? toggleSelected(item.id) : setZoomItem({ image_url: item.image_url, name: item.name })}
                  className={`block w-full h-full ${selecting ? 'cursor-pointer' : 'cursor-zoom-in'}`}
                >
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className={`w-full h-full object-cover ${((item as any).availability ?? 'disponible') !== 'disponible' ? 'opacity-60 grayscale' : ''}`}
                    loading="lazy"
                  />
                </button>
                {selecting ? (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 ${selectedIds.has(item.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-background bg-background/70'}`}
                  >
                    {selectedIds.has(item.id) && <Check className="h-4 w-4" />}
                  </span>
                ) : (
                  <button
                    type="button"
                    aria-label={`Compartir ${item.name}`}
                    onClick={() => shareItems([item], item.id)}
                    disabled={!!sharingId}
                    className="absolute bottom-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {sharingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                <div>
                  <p className="font-body font-medium text-sm text-foreground truncate"><IconText text={item.name} /></p>
                  <p className="text-xs text-muted-foreground">
                    <IconText text={CATEGORIES[item.category] || item.category} />
                    {getSubcategoryLabel(item.category, (item as any).subcategory)
                       ? ` · ${getSubcategoryLabel(item.category, (item as any).subcategory)}`
                       : ''}
                    {(item as any).material ? ` · ${(item as any).material}` : ''}
                  </p>
                  {item.color && <p className="text-xs text-muted-foreground mt-0.5">{item.color}</p>}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={`w-full px-2 py-1 rounded-full text-xs font-body font-medium transition-opacity hover:opacity-80 ${getAvailability((item as any).availability).className}`}
                    >
                      <IconText text={getAvailability((item as any).availability).emoji} /> {getAvailability((item as any).availability).label}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover z-50">
                    {AVAILABILITY_OPTIONS.map((o) => (
                      <DropdownMenuItem
                        key={o.value}
                        onClick={() => availabilityMutation.mutate({ id: item.id, availability: o.value })}
                      >
                        <IconText text={o.emoji} /> {o.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <button
                onClick={() => favMutation.mutate({ id: item.id, is_favorite: !(item as any).is_favorite })}
                className={`absolute top-2 left-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm transition-opacity ${(item as any).is_favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <Heart className={`h-4 w-4 ${(item as any).is_favorite ? 'fill-destructive text-destructive' : 'text-muted-foreground'}`} />
              </button>
              <button
                onClick={() => setEditingItem(item)}
                className="absolute top-2 right-10 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => prepareDelete(item)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </button>

            </div>
          ))}
        </div>
      )}

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => { if (!open) setEditingItem(null); }}
        />
      )}

      <DeleteItemConfirmDialog
        item={itemToDelete}
        historyCount={deleteRefs.history}
        planCount={deleteRefs.plans}
        open={isConfirmOpen}
        onOpenChange={(open) => {
          setIsConfirmOpen(open);
          if (!open) {
            setItemToDelete(null);
            setDeleteRefs({ history: 0, plans: 0 });
          }
        }}
        onConfirm={handleConfirmDelete}
        isPending={deleteMutation.isPending}
      />

      <ItemLightbox
        src={zoomItem?.image_url ?? ''}
        alt={zoomItem?.name}
        open={!!zoomItem}
        onClose={() => setZoomItem(null)}
      />
    </div>

  );
}
