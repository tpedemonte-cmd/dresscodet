import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, ExternalLink, Truck, ShoppingBag, Loader2, SlidersHorizontal } from 'lucide-react';
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

const QUICK_SEARCHES = [
  { label: '👕 Remeras', query: 'remera' },
  { label: '👖 Jeans', query: 'jean' },
  { label: '🧥 Camperas', query: 'campera' },
  { label: '👟 Zapatillas', query: 'zapatillas' },
  { label: '👗 Vestidos', query: 'vestido' },
  { label: '👔 Camisas', query: 'camisa' },
  { label: '🩳 Shorts', query: 'short' },
  { label: '🧶 Buzos', query: 'buzo hoodie' },
];

type Product = {
  id: string;
  title: string;
  price: number;
  currency: string;
  thumbnail: string;
  image: string;
  permalink: string;
  free_shipping: boolean;
  seller: string;
  available_quantity: number;
};

export default function Marketplace() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [priceRange, setPriceRange] = useState('all');
  const [size, setSize] = useState('all');
  const [freeShippingOnly, setFreeShippingOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) {
      toast.error('Escribí qué prenda buscás');
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('search-marketplace', {
        body: {
          query: size !== 'all' ? `${q} talle ${size}` : q,
          limit: 24,
          priceRange: priceRange !== 'all' ? priceRange : undefined,
          freeShipping: freeShippingOnly || undefined,
        },
      });

      if (error) throw error;

      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      toast.error('Error al buscar productos');
    } finally {
      setLoading(false);
    }
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
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-primary" />
          Tienda
        </h2>
        <p className="text-muted-foreground font-body">Encontrá prendas nuevas para tu placard</p>
      </div>

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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
        </Button>
      </div>

      {/* Filters toggle */}
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {QUICK_SEARCHES.map((qs) => (
            <button
              key={qs.query}
              onClick={() => {
                setQuery(qs.query);
                handleSearch(qs.query);
              }}
              className="px-3 py-1.5 text-sm font-body rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            >
              {qs.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0"
        >
          <SlidersHorizontal className="h-4 w-4 mr-1" />
          Filtros
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Precio</Label>
              <Select value={priceRange} onValueChange={setPriceRange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Talle</Label>
              <Select value={size} onValueChange={setSize}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <div className="flex items-center gap-2 h-9">
                <Switch
                  id="free-shipping"
                  checked={freeShippingOnly}
                  onCheckedChange={setFreeShippingOnly}
                />
                <Label htmlFor="free-shipping" className="text-sm cursor-pointer flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5" /> Envío gratis
                </Label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!loading && searched && products.length === 0 && (
        <div className="text-center py-12 text-muted-foreground font-body">
          No se encontraron productos. Probá con otra búsqueda.
        </div>
      )}

      {!loading && products.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground font-body">
            {total.toLocaleString('es-AR')} resultados
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {products.map((product) => (
              <a
                key={product.id}
                href={product.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="group bg-card rounded-xl overflow-hidden shadow-card hover:shadow-elevated transition-all hover:-translate-y-0.5"
              >
                <div className="aspect-square bg-secondary overflow-hidden">
                  <img
                    src={product.image || product.thumbnail}
                    alt={product.title}
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = product.thumbnail;
                    }}
                  />
                </div>
                <div className="p-3 space-y-1.5">
                  <p className="text-xs font-body text-foreground line-clamp-2 leading-tight">
                    {product.title}
                  </p>
                  <p className="text-base font-display font-bold text-foreground">
                    {formatPrice(product.price, product.currency)}
                  </p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {product.free_shipping && (
                      <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 py-0">
                        <Truck className="h-3 w-3" /> Gratis
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <ExternalLink className="h-2.5 w-2.5" /> Ver en ML
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {!searched && (
        <div className="text-center py-12 space-y-2">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <p className="text-muted-foreground font-body">
            Buscá prendas para completar tu outfit ideal
          </p>
        </div>
      )}
    </div>
  );
}
