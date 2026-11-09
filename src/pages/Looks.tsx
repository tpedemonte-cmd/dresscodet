import IconText from '@/components/IconText';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, ImageIcon, Share2, Copy, Check } from 'lucide-react';
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
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          Mis Looks
        </h2>
        <p className="text-muted-foreground font-body">Tus outfits generados con el probador virtual</p>
      </div>

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
            <div key={look.id} className="bg-card rounded-xl overflow-hidden shadow-card group relative">
              <button
                type="button"
                onClick={() => setZoomUrl(look.image_url)}
                aria-label="Ver look en pantalla completa"
                className="block w-full aspect-[3/4] cursor-zoom-in"
              >
                <img src={look.image_url} alt="Look guardado" className="w-full h-full object-cover" loading="lazy" />
              </button>
              <div className="p-3 space-y-1">
                {look.note && (
                  <p className="text-xs font-body text-foreground line-clamp-2"><IconText text={look.note} /></p>
                )}
                <p className="text-[10px] text-muted-foreground font-body">
                  {new Date(look.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                      <Share2 className="h-4 w-4 text-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-2 flex gap-2" side="bottom" align="end">
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
              </div>
            </div>
          ))}
        </div>
      )}

      <ItemLightbox src={zoomUrl ?? ''} alt="Look guardado" open={!!zoomUrl} onClose={closeZoom} />
    </div>
  );
}
