import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Camera, Upload, Loader2, Sparkles, RotateCcw, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES: Record<string, string> = {
  remera: '👕', pantalon: '👖', campera: '🧥', buzo: '🧶',
  camisa: '👔', short: '🩳', vestido: '👗', pollera: '💃',
  zapatillas: '👟', zapatos: '👞', accesorio: '🎒', otro: '📦',
};

export default function Tryon() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selfie, setSelfie] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSelfie(reader.result as string);
      setResultImage(null);
    };
    reader.readAsDataURL(f);
  };

  const toggleItem = (item: any) => {
    setResultImage(null);
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) return prev.filter(i => i.id !== item.id);
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
    setResultImage(null);
  };

  const handleTryon = async () => {
    if (!selfie || selectedItems.length === 0) {
      toast.error('Subí tu foto y elegí al menos una prenda');
      return;
    }

    setLoading(true);
    setResultImage(null);

    try {
      const { data, error } = await supabase.functions.invoke('virtual-tryon', {
        body: {
          userPhotoBase64: selfie,
          clothingItems: selectedItems.map(item => ({
            imageUrl: item.image_url,
            name: item.name,
            category: item.category,
          })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.image) {
        setResultImage(data.image);
        toast.success('¡Mirá cómo te queda el outfit!');
      } else {
        throw new Error('No se pudo generar la imagen');
      }
    } catch (err: any) {
      console.error('Tryon error:', err);
      toast.error(err.message || 'Error al generar la prueba virtual');
    } finally {
      setLoading(false);
    }
  };

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const reset = () => {
    setSelfie(null);
    setSelectedItems([]);
    setResultImage(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Probador Virtual
        </h2>
        <p className="text-muted-foreground font-body">Subí tu foto, elegí las prendas y armá tu outfit completo</p>
      </div>

      {/* Step 1: Selfie */}
      <div className="space-y-2">
        <p className="text-sm font-body font-medium text-foreground">1. Tu foto</p>
        {selfie ? (
          <div className="relative w-full max-w-xs mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-card">
            <img src={resultImage || selfie} alt="Tu foto" className="w-full h-full object-cover" />
            {resultImage && (
              <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-body font-medium px-2 py-1 rounded-full">
                ✨ Resultado IA
              </div>
            )}
            <button onClick={reset} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
              <RotateCcw className="h-4 w-4 text-foreground" />
            </button>
          </div>
        ) : (
          <div className="max-w-xs mx-auto aspect-[3/4] bg-secondary rounded-xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border">
            <p className="text-muted-foreground font-body text-sm text-center px-4">
              Subí una foto de cuerpo entero o medio cuerpo
            </p>
            <div className="flex gap-3">
              <Button variant="outline" size="sm" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="h-4 w-4 mr-1" /> Cámara
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1" /> Galería
              </Button>
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Step 2: Select items */}
      <div className="space-y-2">
        <p className="text-sm font-body font-medium text-foreground">
          2. Elegí prendas de tu placard
          <span className="text-muted-foreground font-normal ml-1">(podés seleccionar varias)</span>
        </p>

        {/* Selected items chips */}
        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.map(item => (
              <span key={item.id} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-body px-2 py-1 rounded-full">
                {CATEGORIES[item.category] || '📦'} {item.name}
                <button onClick={() => removeItem(item.id)} className="hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body">No tenés prendas todavía. ¡Agregá una primero!</p>
        ) : (
          <div className="relative">
            <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-card">
              <ChevronLeft className="h-4 w-4 text-foreground" />
            </button>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-6 py-1" style={{ scrollbarWidth: 'none' }}>
              {items.map((item) => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`flex-shrink-0 w-20 rounded-xl overflow-hidden transition-all relative ${
                      isSelected
                        ? 'ring-2 ring-primary scale-105 shadow-elevated'
                        : 'shadow-card hover:shadow-elevated'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-10 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">
                        ✓
                      </div>
                    )}
                    <div className="aspect-square">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-1 bg-card">
                      <p className="text-[10px] font-body text-foreground truncate text-center">
                        {CATEGORIES[item.category] || '📦'} {item.name}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm rounded-full p-1 shadow-card">
              <ChevronRight className="h-4 w-4 text-foreground" />
            </button>
          </div>
        )}
      </div>

      {/* Generate button */}
      <Button variant="warm" className="w-full" disabled={!selfie || selectedItems.length === 0 || loading} onClick={handleTryon}>
        {loading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando outfit virtual...</>
        ) : (
          <><Sparkles className="h-4 w-4 mr-2" /> Probarme {selectedItems.length > 1 ? `estas ${selectedItems.length} prendas` : 'esta prenda'}</>
        )}
      </Button>

      {/* Info */}
      <div className="bg-card rounded-xl p-4 shadow-card text-center">
        <p className="text-sm text-muted-foreground font-body">
          Seleccioná varias prendas para armar un outfit completo. La IA genera una imagen aproximada ✨
        </p>
      </div>
    </div>
  );
}
