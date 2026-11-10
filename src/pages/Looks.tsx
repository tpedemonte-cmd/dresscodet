import IconText from '@/components/IconText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, ImageIcon, Share2, Copy, Check, X, Loader2, Mail } from 'lucide-react';
import { useImageShare } from '@/lib/useImageShare';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCallback, useState } from 'react';
import StyleRecommendationsWidget from '@/components/StyleRecommendationsWidget';
import ItemLightbox from '@/components/ItemLightbox';

export default function Looks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const closeZoom = useCallback(() => setZoomUrl(null), []);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { shareImages, sharingKey } = useImageShare();

  const lookFileName = (look: { note: string | null; created_at: string }) => {
    const date = new Date(look.created_at).toISOString().slice(0, 10);
    return look.note && /[a-z0-9]/i.test(look.note) ? `look ${look.note.slice(0, 40)}` : `look ${date}`;
  };

  const shareLookImages = (list: { id: string; image_url: string; note: string | null; created_at: string }[], key: string) =>
    shareImages(
      list.map((l) => ({ url: l.image_url, name: lookFileName(l) })),
      key,
      {
        title: list.length === 1 ? 'Mi look' : 'Mis looks',
        text: list.length === 1 && list[0].note ? `Mirá mi look: ${list[0].note}` : 'Looks que armé en DressCode',
        onShared: key === 'seleccion' ? () => { setSelecting(false); setSelectedIds(new Set()); } : undefined,
      },
    );

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const shareLook = (imageUrl: string, note: string | null, method: 'whatsapp' | 'twitter' | 'copy') => {
    const text = note ? `Mirá mi look: ${note}` : '¡Mirá el look que armé!';
    const url = imageUrl;

    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank');
    } else if (method === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedId(url);
        toast.success('Link copiado');
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  const { data: looks = [], isLoading } = useQuery({
    queryKey: ['saved_looks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_looks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_looks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_looks'] });
      toast.success('Look eliminado');
    },
    onError: () => toast.error('Error al eliminar el look'),
  });


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ImageIcon className="h-6 w-6 text-primary" />
            Mis Looks
          </h2>
          <p className="text-muted-foreground font-body">Tus outfits generados con el probador virtual</p>
        </div>
        {looks.length > 0 && !selecting && (
          <Button variant="outline" size="sm" onClick={() => { setSelecting(true); setSelectedIds(new Set()); }}>
            <Share2 className="h-4 w-4" /> Compartir
          </Button>
        )}
      </div>

      {selecting && (
        <div className="sticky top-[4.5rem] z-40 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-3 shadow-card backdrop-blur-sm">
          <p className="mr-auto text-sm font-body text-foreground">
            {selectedIds.size === 0 ? 'Tocá los looks que querés compartir' : `${selectedIds.size} seleccionado${selectedIds.size === 1 ? '' : 's'}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const allSelected = looks.every((l) => selectedIds.has(l.id));
              setSelectedIds(allSelected ? new Set() : new Set(looks.map((l) => l.id)));
            }}
          >
            {looks.every((l) => selectedIds.has(l.id)) ? 'Quitar todos' : 'Seleccionar todos'}
          </Button>
          <Button
            size="sm"
            disabled={selectedIds.size === 0 || !!sharingKey}
            onClick={() => shareLookImages(looks.filter((l) => selectedIds.has(l.id)), 'seleccion')}
          >
            {sharingKey === 'seleccion' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
            Compartir{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
          </Button>
          <Button variant="ghost" size="icon" aria-label="Cancelar" onClick={() => { setSelecting(false); setSelectedIds(new Set()); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <StyleRecommendationsWidget />

      {/* Looks Gallery */}
      {looks.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center space-y-4">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-body">Todavía no guardaste ningún look</p>
          <Link to="/probador">
            <Button variant="warm">Ir al probador virtual</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {looks.map((look) => (
            <div key={look.id} className={`bg-card rounded-xl overflow-hidden shadow-card group relative ${selecting && selectedIds.has(look.id) ? 'ring-2 ring-primary' : ''}`}>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => selecting ? toggleSelected(look.id) : setZoomUrl(look.image_url)}
                  aria-label={selecting ? 'Seleccionar look' : 'Ver look en pantalla completa'}
                  aria-pressed={selecting ? selectedIds.has(look.id) : undefined}
                  className={`block w-full aspect-[3/4] ${selecting ? 'cursor-pointer' : 'cursor-zoom-in'}`}
                >
                  <img src={look.image_url} alt="Look guardado" className="w-full h-full object-cover" loading="lazy" />
                </button>
                {selecting && (
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 ${selectedIds.has(look.id) ? 'border-primary bg-primary text-primary-foreground' : 'border-background bg-background/70'}`}
                  >
                    {selectedIds.has(look.id) && <Check className="h-4 w-4" />}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-1">
                {look.note && (
                  <p className="text-xs font-body text-foreground line-clamp-2"><IconText text={look.note} /></p>
                )}
                <p className="text-[10px] text-muted-foreground font-body">
                  {new Date(look.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {!selecting && <div className="absolute top-2 right-2 z-10 flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                      <Share2 className="h-4 w-4 text-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 flex flex-wrap gap-2" side="bottom" align="end">
                    <button
                      onClick={() => shareLookImages([look], look.id)}
                      disabled={!!sharingKey}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      {sharingKey === look.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                      Imagen / Mail
                    </button>
                    <button
                      onClick={() => shareLook(look.image_url, look.note, 'whatsapp')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[hsl(142,70%,45%)] text-white text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      WhatsApp
                    </button>
                    <button
                      onClick={() => shareLook(look.image_url, look.note, 'twitter')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      X / Twitter
                    </button>
                    <button
                      onClick={() => shareLook(look.image_url, look.note, 'copy')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                    >
                      {copiedId === look.image_url ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      Link
                    </button>
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => deleteMutation.mutate(look.id)}
                  className="bg-background/80 backdrop-blur-sm rounded-full p-1.5"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>}
            </div>
          ))}
        </div>
      )}

      <ItemLightbox src={zoomUrl ?? ''} alt="Look guardado" open={!!zoomUrl} onClose={closeZoom} />
    </div>
  );
}
