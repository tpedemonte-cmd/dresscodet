import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Heart, Trash2, ExternalLink, Truck, Plus, Link, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import DeleteWishlistConfirmDialog from '@/components/DeleteWishlistConfirmDialog';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mlUrl, setMlUrl] = useState('');
  const [manualTitle, setManualTitle] = useState('');

  const [adding, setAdding] = useState(false);
  const [step, setStep] = useState<'url' | 'details'>('url');
  const [extractedData, setExtractedData] = useState<{ product_id: string; permalink: string; thumbnail: string } | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<WishlistItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const resetDialog = () => {
    setMlUrl('');
    setManualTitle('');
    
    setStep('url');
    setExtractedData(null);
  };

  const handleExtractUrl = async () => {
    if (!mlUrl.trim()) {
      toast.error('Pegá un link de Mercado Libre');
      return;
    }

    if (!mlUrl.includes('mercadolibre.com') && !mlUrl.includes('mercadolibre.co')) {
      toast.error('El link debe ser de Mercado Libre');
      return;
    }

    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('extract-ml-product', {
        body: { url: mlUrl.trim() },
      });

      if (error || !data?.success) {
        toast.error(data?.error || 'No se pudo procesar el link');
        return;
      }

      const product = data.product;
      setExtractedData({
        product_id: product.product_id,
        permalink: product.permalink,
        thumbnail: product.thumbnail,
      });
      if (product.title) setManualTitle(product.title);
      setStep('details');
    } catch (err) {
      toast.error('Error al procesar el link');
    } finally {
      setAdding(false);
    }
  };

  const handleSave = async () => {
    if (!manualTitle.trim()) {
      toast.error('Ponele un nombre al producto');
      return;
    }
    if (!user || !extractedData) return;

    // Check if already in wishlist
    const existing = items.find(i => i.product_id === extractedData.product_id);
    if (existing) {
      toast.info('Este producto ya está en tu wishlist');
      return;
    }

    setAdding(true);
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('wishlist')
        .insert({
          user_id: user.id,
          product_id: extractedData.product_id,
          title: manualTitle.trim(),
          price: 0,
          currency: 'ARS',
          thumbnail: extractedData.thumbnail,
          image: null,
          permalink: extractedData.permalink,
          free_shipping: false,
          seller: null,
        })
        .select()
        .single();

      if (insertError) {
        toast.error('Error al guardar en la wishlist');
        return;
      }

      setItems(prev => [inserted as WishlistItem, ...prev]);
      setDialogOpen(false);
      resetDialog();
      toast.success('¡Producto agregado a tu wishlist!');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setAdding(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Mi Wishlist
          </h2>
          <p className="text-muted-foreground font-body">
            {items.length} {items.length === 1 ? 'producto guardado' : 'productos guardados'}
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetDialog(); }}>
          <DialogTrigger asChild>
            <Button variant="warm" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link className="h-5 w-5 text-primary" />
                {step === 'url' ? 'Agregar desde Mercado Libre' : 'Completá los datos'}
              </DialogTitle>
              <DialogDescription>
                {step === 'url'
                  ? 'Pegá el link del producto de Mercado Libre.'
                  : 'Confirmá el nombre y agregá el precio si querés.'}
              </DialogDescription>
            </DialogHeader>

            {step === 'url' ? (
              <div className="space-y-4">
                <Input
                  value={mlUrl}
                  onChange={(e) => setMlUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleExtractUrl()}
                  placeholder="https://articulo.mercadolibre.com.ar/MLA-..."
                  disabled={adding}
                />
                <Button
                  variant="warm"
                  className="w-full"
                  onClick={handleExtractUrl}
                  disabled={adding || !mlUrl.trim()}
                >
                  {adding ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Procesando...</>
                  ) : (
                    <>Continuar</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-name">Nombre del producto</Label>
                  <Input
                    id="product-name"
                    value={manualTitle}
                    onChange={(e) => setManualTitle(e.target.value)}
                    placeholder="Ej: Campera de cuero negra"
                  />
                </div>


                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('url')}>
                    Atrás
                  </Button>
                  <Button
                    variant="warm"
                    className="flex-1"
                    onClick={handleSave}
                    disabled={adding || !manualTitle.trim()}
                  >
                    {adding ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                    ) : (
                      <><Heart className="h-4 w-4" /> Guardar</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <p className="text-4xl">💫</p>
          <p className="text-muted-foreground font-body">Tu wishlist está vacía.</p>
          <p className="text-sm text-muted-foreground font-body">Tocá "Agregar" y pegá un link de Mercado Libre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-card rounded-xl shadow-card overflow-hidden flex gap-3 p-3">
              <a
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-secondary flex items-center justify-center"
              >
                <img
                  src={item.image || item.thumbnail}
                  alt={item.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.display = 'none';
                    img.parentElement!.innerHTML = '<span class="text-3xl">🛍️</span>';
                  }}
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
                  {item.price > 0 && (
                    <p className="text-base font-display font-bold text-foreground mt-1">
                      {formatPrice(item.price, item.currency)}
                    </p>
                  )}
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
