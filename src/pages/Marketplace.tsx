import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, ExternalLink, Truck, ShoppingBag, Loader2, SlidersHorizontal, Heart, Trash2 } from 'lucide-react';
import DeleteWishlistConfirmDialog from '@/components/DeleteWishlistConfirmDialog';
import { toast } from 'sonner';

const PRICE_RANGES = [
  { label: 'Todos los precios', value: 'all' },
  { label: 'Hasta $20.000', value: '0-20000' },
  { label: '$20.000 - $50.000', value: '20000-50000' },
  { label: '$50.000 - $100.000', value: '50000-100000' },
  { label: 'Más de $100.000', value: '100000-*' },
];

const SIZE_OPTIONS = [
  { label: 'Todos los talles', value: 'all' },
  { label: 'XS', value: 'XS' },
  { label: 'S', value: 'S' },
  { label: 'M', value: 'M' },
  { label: 'L', value: 'L' },
  { label: 'XL', value: 'XL' },
  { label: 'XXL', value: 'XXL' },
];

const CATEGORIES = [
  { label: '👕 Remeras', query: 'remera', emoji: '👕' },
  { label: '👖 Jeans', query: 'jean', emoji: '👖' },
  { label: '🧥 Camperas', query: 'campera', emoji: '🧥' },
  { label: '👟 Zapatillas', query: 'zapatillas', emoji: '👟' },
  { label: '👗 Vestidos', query: 'vestido', emoji: '👗' },
  { label: '👔 Camisas', query: 'camisa', emoji: '👔' },
  { label: '🩳 Shorts', query: 'short', emoji: '🩳' },
  { label: '🧶 Buzos', query: 'buzo hoodie', emoji: '🧶' },
  { label: '👜 Carteras', query: 'cartera mujer', emoji: '👜' },
  { label: '⌚ Relojes', query: 'reloj moda', emoji: '⌚' },
  { label: '📿 Cadenas', query: 'cadena collar moda', emoji: '📿' },
  { label: '💍 Anillos', query: 'anillo moda', emoji: '💍' },
  { label: '🧿 Pulseras', query: 'pulsera moda', emoji: '🧿' },
  { label: '🕶️ Lentes', query: 'lentes de sol moda', emoji: '🕶️' },
  { label: '🧢 Gorras', query: 'gorra', emoji: '🧢' },
  { label: '🩴 Ojotas', query: 'ojotas', emoji: '🩴' },
  { label: '🧣 Bufandas', query: 'bufanda moda', emoji: '🧣' },
  { label: '👛 Billeteras', query: 'billetera moda', emoji: '👛' },
  { label: '🎒 Mochilas', query: 'mochila moda', emoji: '🎒' },
  { label: '🧤 Guantes', query: 'guantes moda', emoji: '🧤' },
  { label: '💎 Aros', query: 'aros mujer moda', emoji: '💎' },
];

type WishlistItem = {
  id: string;
  product_id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  image: string | null;
  permalink: string;
  free_shipping: boolean | null;
  seller: string | null;
  created_at: string;
};

export default function Marketplace() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [priceRange, setPriceRange] = useState('all');
  const [size, setSize] = useState('all');
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [showWishlist, setShowWishlist] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setWishlist(data as WishlistItem[]);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const removeFromWishlist = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id);
    setWishlist((prev) => prev.filter((w) => w.id !== id));
    toast.success('Eliminado de favoritos');
  };

  const buildSearchUrl = (searchQuery: string) => {
    let searchPath = searchQuery;
    if (size !== 'all') searchPath += ` talle ${size}`;
    let url = `https://listado.mercadolibre.com.ar/${encodeURIComponent(searchPath.replace(/ /g, '-'))}`;
    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-');
      url += max === '*' ? `_PriceRange_${min}-0` : `_PriceRange_${min}-${max}`;
    }
    if (freeShippingOnly) url += '_Frete_Gr%C3%A1tis';
    url += '_Condition_new';
    return url;
  };

  const handleSearch = (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      toast.error('Escribí qué prenda buscás');
      return;
    }
    window.open(buildSearchUrl(q), '_blank');
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency || 'ARS',
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-primary" />
            Tienda
          </h2>
          <p className="text-muted-foreground font-body">Encontrá prendas nuevas en Mercado Libre</p>
        </div>
        {wishlist.length > 0 && (
          <Button
            variant={showWishlist ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowWishlist(!showWishlist)}
            className="gap-1.5"
          >
            <Heart className={`h-4 w-4 ${showWishlist ? 'fill-current' : ''}`} />
            Favoritos
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{wishlist.length}</Badge>
          </Button>
        )}
      </div>

      {/* Wishlist view */}
      {showWishlist ? (
        <div className="space-y-4">
          {wishlist.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground font-body">Todavía no guardaste ningún producto</p>
              <Button variant="outline" size="sm" onClick={() => setShowWishlist(false)}>Explorar tienda</Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground font-body">
                {wishlist.length} producto{wishlist.length !== 1 ? 's' : ''} guardado{wishlist.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-3">
                {wishlist.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card">
                    {item.thumbnail && (
                      <img src={item.image || item.thumbnail} alt={item.title} className="w-16 h-16 rounded-lg object-contain bg-secondary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-body text-foreground line-clamp-2">{item.title}</p>
                      {item.price > 0 && <p className="text-sm font-display font-bold text-foreground">{formatPrice(item.price, item.currency)}</p>}
                    </div>
                    <div className="flex gap-1">
                      <a href={item.permalink} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromWishlist(item.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Buscar ropa, zapatillas, accesorios..."
                className="pl-10"
              />
            </div>
            <Button variant="warm" onClick={() => handleSearch()} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Search className="h-4 w-4" /> Buscar</>}
            </Button>
          </div>

          {/* Filter toggle */}
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
              <SlidersHorizontal className="h-4 w-4 mr-1" /> Filtros
            </Button>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <div className="bg-card rounded-xl p-4 shadow-card space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Precio</Label>
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRICE_RANGES.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Talle</Label>
                  <Select value={size} onValueChange={setSize}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SIZE_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <div className="flex items-center gap-2 h-9">
                    <Switch id="free-shipping" checked={freeShippingOnly} onCheckedChange={setFreeShippingOnly} />
                    <Label htmlFor="free-shipping" className="text-sm cursor-pointer flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5" /> Envío gratis
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Category grid */}
          <div>
            <p className="text-sm font-body text-muted-foreground mb-3">Explorá por categoría</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.query}
                  onClick={() => handleSearch(cat.query)}
                  className="flex flex-col items-center gap-2 p-4 bg-card rounded-xl shadow-card hover:shadow-elevated hover:-translate-y-0.5 transition-all"
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-xs font-body text-foreground">{cat.label.replace(cat.emoji + ' ', '')}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-card text-center space-y-2">
            <p className="text-sm text-muted-foreground font-body">
              Los productos se abren en Mercado Libre donde podés comprar con total seguridad 🔒
            </p>
          </div>
        </>
      )}
    </div>
  );
}
