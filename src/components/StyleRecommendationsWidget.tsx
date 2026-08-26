import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, ExternalLink, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

type StyleRecommendation = {
  item: string;
  reason: string;
  search_query: string;
};

type StyleResult = {
  style_profile: string;
  recommendations: StyleRecommendation[];
};

const getMLUrl = (query: string) =>
  `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;

export default function StyleRecommendationsWidget() {
  const [styleResult, setStyleResult] = useState<StyleResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const displayedRecs = styleResult?.recommendations || [];

  return (
    <div className="bg-card rounded-xl p-5 shadow-card space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Recomendado para vos</h3>
        </div>
        <Button variant="warm" size="sm" onClick={handleAnalyze} disabled={loading}>
          {loading ? (
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

      {!styleResult && !loading && (
        <p className="text-sm text-muted-foreground font-body">
          Analizamos tus looks, outfits y prendas favoritas para recomendarte qué te falta y dónde comprarlo 🛍️
        </p>
      )}

      {styleResult && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
          {styleResult.style_profile && (
            <div className="bg-gradient-to-br from-primary/10 to-secondary/40 border border-primary/20 rounded-lg p-3 space-y-1">
              <p className="text-xs font-body font-semibold text-primary uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Tu onda
              </p>
              <p className="text-sm font-body text-foreground leading-relaxed">
                {styleResult.style_profile}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {displayedRecs.map((rec, i) => (
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
  );
}
