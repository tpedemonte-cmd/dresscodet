import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Heart, Trash2, ExternalLink, Truck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

const formatPrice = (price: number, currency: string) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS', maximumFractionDigits: 0 }).format(price);

export default function Wishlist() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('wishlist')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as WishlistItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const removeItem = async (id: string) => {
    await supabase.from('wishlist').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
    toast.success('Eliminado de tu wishlist');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          Mi Wishlist
        </h2>
        <p className="text-muted-foreground font-body">
          {items.length} {items.length === 1 ? 'producto guardado' : 'productos guardados'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">💫</p>
          <p className="text-muted-foreground font-body">Tu wishlist está vacía.</p>
          <p className="text-sm text-muted-foreground font-body">Guardá productos desde la Tienda para verlos acá.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card rounded-xl shadow-card overflow-hidden flex gap-3 p-3">
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-secondary"
              >
                <img
                  src={item.image || item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).src = item.thumbnail; }}
                />
              </a>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-body font-medium text-foreground line-clamp-2 hover:underline leading-tight"
                  >
                    {item.title}
                  </a>
                  <p className="text-base font-display font-bold text-foreground mt-1">
                    {formatPrice(item.price, item.currency)}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex items-center gap-1.5">
                    {item.free_shipping && (
                      <Badge variant="secondary" className="text-[10px] gap-0.5 px-1.5 py-0">
                        <Truck className="h-2.5 w-2.5" /> Envío gratis
                      </Badge>
                    )}
                    <a
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-2.5 w-2.5" /> Ver en ML
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
