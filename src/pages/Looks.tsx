import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, ImageIcon, Share2, Copy, Check, Sparkles, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

type StyleRecommendation = {
  item: string;
  reason: string;
  search_query: string;
};

type StyleResult = {
  style_profile: string;
  recommendations: StyleRecommendation[];
};

export default function Looks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [styleResult, setStyleResult] = useState<StyleResult | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);

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

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setStyleResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('style-recommendations');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setStyleResult(data);
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('Demasiadas solicitudes, intentá de nuevo en un momento');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        toast.error('Créditos agotados. Agregá fondos en Configuración.');
      } else {
        toast.error('Error al analizar tu estilo');
      }
      console.error(err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const getMLUrl = (query: string) =>
    `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;

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

      {/* Style Recommendations Section */}
      <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h3 className="font-display font-bold text-foreground">Recomendado para vos</h3>
          </div>
          <Button
            variant="warm"
            size="sm"
            onClick={handleGetRecommendations}
            disabled={loadingRecs}
          >
            {loadingRecs ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Analizando...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {styleResult ? 'Actualizar' : 'Analizar mi estilo'}
              </span>
            )}
          </Button>
        </div>

        {!styleResult && !loadingRecs && (
          <p className="text-sm text-muted-foreground font-body">
            Analizamos tus looks, outfits y prendas favoritas para recomendarte qué te falta y dónde comprarlo 🛍️
          </p>
        )}

        {styleResult && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-sm font-body text-foreground">
                <span className="font-medium">Tu estilo:</span> {styleResult.style_profile}
              </p>
            </div>

            <div className="space-y-3">
              {styleResult.recommendations.map((rec, i) => (
                <a
                  key={i}
                  href={getMLUrl(rec.search_query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg bg-secondary/30 border border-border hover:border-primary/40 hover:bg-secondary/50 transition-all group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 flex-1">
                      <p className="text-sm font-body font-medium text-foreground">{rec.item}</p>
                      <p className="text-xs text-muted-foreground font-body">{rec.reason}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0 group-hover:text-primary transition-colors pt-0.5">
                      Buscar <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

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
              <div className="aspect-[3/4]">
                <img src={look.image_url} alt="Look guardado" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 space-y-1">
                {look.note && (
                  <p className="text-xs font-body text-foreground line-clamp-2">{look.note}</p>
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
    </div>
  );
}
