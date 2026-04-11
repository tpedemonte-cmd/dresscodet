import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Sparkles, ShoppingBag, ExternalLink, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import { recomendarPorHistorial, type ScoredOutfit } from '@/lib/outfitSimilarity';
import { analizarUsoPrendas, type ItemUsage } from '@/lib/wardrobeAnalysis';
import { Clock, AlertTriangle } from 'lucide-react';

const MOODS = [
  { value: 'feliz', label: '😊 Feliz' },
  { value: 'relajado', label: '😌 Relajado/a' },
  { value: 'elegante', label: '✨ Elegante' },
  { value: 'casual', label: '😎 Casual' },
  { value: 'energetico', label: '⚡ Energético/a' },
  { value: 'romantico', label: '💕 Romántico/a' },
];

const EVENTS = [
  { value: 'trabajo', label: '💼 Trabajo' },
  { value: 'cita', label: '❤️ Cita' },
  { value: 'amigos', label: '🍻 Juntada con amigos' },
  { value: 'familia', label: '👨‍👩‍👧 Familia' },
  { value: 'fiesta', label: '🎉 Fiesta' },
  { value: 'gym', label: '🏋️ Gym / Deporte' },
  { value: 'casual', label: '🏠 Día casual' },
  { value: 'universidad', label: '📚 Universidad' },
];

const WEATHER = [
  { value: 'soleado', label: '☀️ Soleado' },
  { value: 'nublado', label: '☁️ Nublado' },
  { value: 'lluvia', label: '🌧️ Llueve' },
  { value: 'tormenta', label: '⛈️ Tormenta' },
];

const SEASONS = [
  { value: 'verano', label: '🌞 Verano' },
  { value: 'otoño', label: '🍂 Otoño' },
  { value: 'invierno', label: '❄️ Invierno' },
  { value: 'primavera', label: '🌸 Primavera' },
];

type ShoppingSuggestion = {
  query: string;
  searchUrl: string;
  loading: boolean;
};

export default function Recommend() {
  const { user } = useAuth();
  const [mood, setMood] = useState('');
  const [event, setEvent] = useState('');
  const [temperature, setTemperature] = useState([20]);
  const [weather, setWeather] = useState('');
  const [season, setSeason] = useState('');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommendedWishlistItems, setRecommendedWishlistItems] = useState<any[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<any[]>([]);
  const [shoppingSuggestions, setShoppingSuggestions] = useState<ShoppingSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyMatches, setHistoryMatches] = useState<ScoredOutfit[]>([]);
  const [forgottenSuggestions, setForgottenSuggestions] = useState<ItemUsage[]>([]);

  const { data: items = [] } = useQuery({
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

  const { data: wishlistItems = [] } = useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: outfitHistory = [] } = useQuery({
    queryKey: ['outfit_history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('outfit_history')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const getSearchUrl = async (query: string): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('search-marketplace', {
        body: { query },
      });
      if (error) throw error;
      return data.searchUrl || `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;
    } catch {
      return `https://listado.mercadolibre.com.ar/${encodeURIComponent(query.replace(/ /g, '-'))}`;
    }
  };

  const handleRecommend = async () => {
    if (!mood || !event || !weather || !season) {
      toast.error('Completá todos los campos');
      return;
    }
    if (items.length === 0) {
      toast.error('Primero agregá prendas a tu placard');
      return;
    }

    setLoading(true);
    setRecommendation(null);
    setRecommendedItems([]);
    setRecommendedWishlistItems([]);
    setHistoryMatches([]);
    setForgottenSuggestions([]);
    // Calcular similitud con historial
    const matches = recomendarPorHistorial(
      outfitHistory as any,
      temperature[0],
      weather,
      event
    );
    setHistoryMatches(matches.slice(0, 3));

    try {
      const wardrobeSummary = items.map(i =>
        `- ID:${i.id} | ${i.name} (${i.category}${i.color ? ', ' + i.color : ''})${i.is_favorite ? ' ⭐ FAVORITA' : ''}`
      ).join('\n');

      const wishlistSummary = wishlistItems.length > 0
        ? wishlistItems.map((w: any) => `- ID:${w.id} | ${w.title} ($${w.price} ${w.currency})`).join('\n')
        : '';

      const { data, error } = await supabase.functions.invoke('recommend-outfit', {
        body: { wardrobe: wardrobeSummary, wishlist: wishlistSummary, mood, event, temperature: temperature[0], weather, season },
      });

      if (error) throw error;

      const fullText: string = data.recommendation || '';

      // Parse ITEMS_USADOS
      const itemsMatch = fullText.match(/ITEMS_USADOS:\s*(.+)/i);
      let cleanText = fullText
        .replace(/\n?ITEMS_USADOS:.+/i, '')
        .replace(/\n?WISHLIST_USADOS:.+/i, '')
        .replace(/\n?COMPRAR:.+/i, '')
        .trim();
      setRecommendation(cleanText);

      let usedItemIds: string[] = [];
      if (itemsMatch && itemsMatch[1].trim() !== 'ninguno') {
        usedItemIds = itemsMatch[1].split(',').map((id: string) => id.trim());
        setRecommendedItems(items.filter(item => usedItemIds.includes(item.id)));
      }

      // Parse WISHLIST_USADOS
      const wishlistMatch = fullText.match(/WISHLIST_USADOS:\s*(.+)/i);
      if (wishlistMatch && wishlistMatch[1].trim() !== 'ninguno') {
        const usedWishlistIds = wishlistMatch[1].split(',').map((id: string) => id.trim());
        setRecommendedWishlistItems(wishlistItems.filter((w: any) => usedWishlistIds.includes(w.id)));
      }

      // Parse COMPRAR
      const buyMatch = fullText.match(/COMPRAR:\s*(.+)/i);
      if (buyMatch && buyMatch[1].trim() !== 'nada') {
        const queries = buyMatch[1].split('|').map((q: string) => q.trim()).filter(Boolean);
        const suggestions: ShoppingSuggestion[] = queries.map(q => ({ query: q, searchUrl: '', loading: true }));
        setShoppingSuggestions(suggestions);

        const results = await Promise.all(queries.map(q => getSearchUrl(q)));
        setShoppingSuggestions(queries.map((q, i) => ({ query: q, searchUrl: results[i], loading: false })));
      }

      // Save to history
      if (user) {
        await supabase.from('outfit_history').insert({
          user_id: user.id,
          mood, event, temperature: temperature[0], weather, season,
          recommendation: cleanText,
          recommended_item_ids: usedItemIds,
        } as any);
      }
    } catch (err: any) {
      if (err?.message?.includes('429') || err?.status === 429) {
        toast.error('Demasiadas solicitudes, intentá de nuevo en un momento');
      } else if (err?.message?.includes('402') || err?.status === 402) {
        toast.error('Créditos agotados. Agregá fondos en Configuración.');
      } else {
        toast.error('Error al generar la recomendación');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(price);

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">¿Qué me pongo?</h2>
        <p className="text-muted-foreground font-body">Contanos cómo te sentís y a dónde vas</p>
      </div>

      <div className="space-y-5 bg-card p-6 rounded-xl shadow-card">
        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Estado de ánimo</label>
          <Select value={mood} onValueChange={setMood}>
            <SelectTrigger><SelectValue placeholder="¿Cómo te sentís?" /></SelectTrigger>
            <SelectContent>
              {MOODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Tipo de juntada</label>
          <Select value={event} onValueChange={setEvent}>
            <SelectTrigger><SelectValue placeholder="¿A dónde vas?" /></SelectTrigger>
            <SelectContent>
              {EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-body font-medium text-foreground">
            Temperatura: {temperature[0]}°C
          </label>
          <Slider value={temperature} onValueChange={setTemperature} min={-5} max={45} step={1} />
          <div className="flex justify-between text-xs text-muted-foreground font-body">
            <span>🥶 -5°C</span><span>🔥 45°C</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Clima</label>
          <Select value={weather} onValueChange={setWeather}>
            <SelectTrigger><SelectValue placeholder="¿Cómo está el clima?" /></SelectTrigger>
            <SelectContent>
              {WEATHER.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-body font-medium text-foreground">Estación del año</label>
          <Select value={season} onValueChange={setSeason}>
            <SelectTrigger><SelectValue placeholder="¿En qué estación estamos?" /></SelectTrigger>
            <SelectContent>
              {SEASONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Button variant="warm" className="w-full" disabled={loading || !mood || !event || !weather || !season} onClick={handleRecommend}>
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-accent-foreground border-t-transparent rounded-full" />
              Pensando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Recomendame un outfit
            </span>
          )}
        </Button>
      </div>

      {/* History-based similarity matches */}
      {historyMatches.length > 0 && (
        <div className="bg-card p-6 rounded-xl shadow-card space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Outfits similares de tu historial
          </h3>
          <div className="space-y-3">
            {historyMatches.map((match, idx) => {
              const matchItems = items.filter(item =>
                (match.recommended_item_ids || []).includes(item.id)
              );
              return (
                <div key={match.id} className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-body text-muted-foreground">
                      #{idx + 1} · Score: {match.score.toFixed(1)} · {match.event} · {match.weather} · {match.temperature}°C
                    </span>
                    <span className="text-xs text-muted-foreground font-body">
                      {new Date(match.created_at).toLocaleDateString('es-AR')}
                    </span>
                  </div>
                  <p className="text-sm font-body text-foreground line-clamp-3">{match.recommendation}</p>
                  {matchItems.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {matchItems.map((item) => (
                        <div key={item.id} className="shrink-0 w-14 rounded-md overflow-hidden bg-secondary">
                          <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover" />
                          <p className="text-[10px] font-body text-center truncate px-0.5">{item.name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recommendation && (
        <div className="bg-card p-6 rounded-xl shadow-elevated space-y-3 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Tu outfit recomendado
          </h3>
          <div className="font-body text-foreground whitespace-pre-line leading-relaxed">
            {recommendation}
          </div>
          {recommendedItems.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm font-body font-medium text-muted-foreground mb-2">Prendas del outfit:</p>
              <div className="grid grid-cols-3 gap-2">
                {recommendedItems.map((item) => (
                  <div key={item.id} className="rounded-lg overflow-hidden bg-secondary">
                    <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover" />
                    <p className="text-xs font-body text-center py-1 text-foreground truncate px-1">{item.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {recommendedWishlistItems.length > 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm font-body font-medium text-muted-foreground mb-2">🛒 De tu wishlist (todavía no lo tenés):</p>
              <div className="grid grid-cols-3 gap-2">
                {recommendedWishlistItems.map((item: any) => (
                  <a
                    key={item.id}
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg overflow-hidden bg-secondary/50 border border-dashed border-primary/30 hover:border-primary transition-colors group"
                  >
                    <img src={item.image || item.thumbnail} alt={item.title} className="w-full aspect-square object-contain group-hover:scale-105 transition-transform" />
                    <p className="text-xs font-body text-center py-1 text-foreground truncate px-1">{item.title}</p>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shopping suggestions */}
      {shoppingSuggestions.length > 0 && (
        <div className="bg-card p-6 rounded-xl shadow-elevated space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Te falta algo? Compralo acá
          </h3>
          {shoppingSuggestions.map((suggestion, idx) => (
            <div key={idx}>
              {suggestion.loading ? (
                <div className="flex items-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-body">{suggestion.query}</span>
                </div>
              ) : (
                <a
                  href={suggestion.searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 p-3 rounded-lg bg-secondary hover:bg-accent transition-colors group"
                >
                  <span className="text-sm font-body font-medium text-foreground capitalize">
                    🔍 {suggestion.query}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1 group-hover:text-foreground transition-colors">
                    Ver en ML <ExternalLink className="h-3 w-3" />
                  </span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
