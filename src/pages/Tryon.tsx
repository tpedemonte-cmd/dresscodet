import { useState, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RotateCcw, X, Save, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getSubcategories, getSubcategoryLabel } from '@/lib/subcategories';

const CATEGORIES: Record<string, string> = {
  remera: '👕', pantalon: '👖', campera: '🧥', buzo: '🧶',
  camisa: '👔', short: '🩳', vestido: '👗', pollera: '💃',
  zapatillas: '👟', zapatos: '👞', medias: '🧦', accesorio: '🎒', otro: '📦',
};

export default function Tryon() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selfie, setSelfie] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState({ height: '170', weight: '65', age: '', gender: 'femenino' });
  const [generatingAvatar, setGeneratingAvatar] = useState(false);

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

  const { data: savedModels = [] } = useQuery({
    queryKey: ['user_models', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_models')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleGenerateAvatar = async () => {
    const { height, weight, age, gender } = avatarData;
    if (!height || !weight || !age) {
      toast.error('Completá altura, peso y edad');
      return;
    }
    setGeneratingAvatar(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-avatar', {
        body: { height: Number(height), weight: Number(weight), age: Number(age), gender },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.image) {
        setSelfie(data.image);
        setActiveModelId(null);
        setResultImage(null);
        toast.success('¡Modelo generado! Ahora podés guardarlo.');
      }
    } catch (err: any) {
      console.error('Avatar error:', err);
      toast.error(err.message || 'Error al generar el modelo');
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const saveModelMutation = useMutation({
    mutationFn: async () => {
      // Guardamos la imagen que se está viendo: si hay resultado de IA (con la ropa puesta), esa
      const source = resultImage || selfie;
      if (!source || !user) throw new Error('No hay modelo para guardar');
      setSavingModel(true);

      let blob: Blob;
      if (source.startsWith('data:')) {
        const base64Data = source.split(',')[1];
        const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
        blob = new Blob([bytes], { type: 'image/png' });
      } else {
        const response = await fetch(source);
        if (!response.ok) throw new Error('No se pudo descargar la imagen del modelo');
        blob = await response.blob();
      }


      const fileName = `${user.id}/model-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('look-images')
        .upload(fileName, blob, { contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('look-images').getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('user_models')
        .insert({
          user_id: user.id,
          image_url: urlData.publicUrl,
          height: Number(avatarData.height),
          weight: Number(avatarData.weight),
          age: Number(avatarData.age),
          gender: avatarData.gender,
          is_active: true,
        })
        .select()
        .single();
      if (error) throw error;

      // Desactivar otros modelos
      await supabase
        .from('user_models')
        .update({ is_active: false })
        .neq('id', data.id)
        .eq('user_id', user.id);

      return data;
    },
    onSuccess: (data) => {
      setActiveModelId(data.id);
      queryClient.invalidateQueries({ queryKey: ['user_models'] });
      toast.success('¡Modelo guardado!');
    },
    onError: (err: any) => {
      console.error('Save model error:', err);
      toast.error(err.message || 'Error al guardar el modelo');
    },
    onSettled: () => setSavingModel(false),
  });

  const selectModelMutation = useMutation({
    mutationFn: async (model: any) => {
      if (!user) throw new Error('No hay usuario');
      await supabase
        .from('user_models')
        .update({ is_active: false })
        .eq('user_id', user.id);
      await supabase
        .from('user_models')
        .update({ is_active: true })
        .eq('id', model.id)
        .eq('user_id', user.id);
      return model;
    },
    onSuccess: (model) => {
      setSelfie(model.image_url);
      setActiveModelId(model.id);
      setAvatarData({
        height: String(model.height),
        weight: String(model.weight),
        age: String(model.age),
        gender: model.gender,
      });
      setResultImage(null);
      queryClient.invalidateQueries({ queryKey: ['user_models'] });
    },
    onError: () => toast.error('Error al seleccionar el modelo'),
  });

  const deleteModelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (activeModelId === id) {
        setSelfie(null);
        setActiveModelId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['user_models'] });
      toast.success('Modelo eliminado');
    },
    onError: () => toast.error('Error al eliminar el modelo'),
  });

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
      toast.error('Generá o seleccioná un modelo y elegí al menos una prenda');
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

  const handleSaveLook = async () => {
    if (!resultImage || !user) return;
    setSaving(true);

    try {
      const base64Data = resultImage.startsWith('data:')
        ? resultImage.split(',')[1]
        : resultImage;
      const byteChars = atob(base64Data);
      const byteArray = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) {
        byteArray[i] = byteChars.charCodeAt(i);
      }
      const blob = new Blob([byteArray], { type: 'image/png' });

      const fileName = `${user.id}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('look-images')
        .upload(fileName, blob, { contentType: 'image/png' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('look-images').getPublicUrl(fileName);

      const itemNames = selectedItems.map(i => `${CATEGORIES[i.category] || '📦'} ${i.name}`).join(', ');

      const { error: insertError } = await supabase.from('saved_looks').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        item_ids: selectedItems.map(i => i.id),
        note: itemNames,
      });
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['saved_looks'] });
      toast.success('¡Look guardado en tu galería!');
    } catch (err: any) {
      console.error('Save look error:', err);
      toast.error('Error al guardar el look');
    } finally {
      setSaving(false);
    }
  };


  const reset = () => {
    setSelfie(null);
    setActiveModelId(null);
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
        <p className="text-muted-foreground font-body">Elegí las prendas y armá tu outfit completo</p>
      </div>

      {/* Step 1: Model */}
      <div className="space-y-3">
        <p className="text-sm font-body font-medium text-foreground">1. Tu modelo</p>

        {selfie ? (
          <div className="space-y-3">
            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-card">
              <img src={resultImage || selfie} alt="Tu modelo" className="w-full h-full object-cover" />
              {resultImage && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-body font-medium px-2 py-1 rounded-full">
                  ✨ Resultado IA
                </div>
              )}
              <button onClick={reset} className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5">
                <RotateCcw className="h-4 w-4 text-foreground" />
              </button>
            </div>

            {(!activeModelId || resultImage) && (
              <Button
                variant="outline"
                className="w-full max-w-sm mx-auto"
                disabled={savingModel}
                onClick={() => saveModelMutation.mutate()}
              >
                {savingModel ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando modelo...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> {resultImage ? 'Guardar modelo con esta ropa' : 'Guardar este modelo'}</>
                )}
              </Button>
            )}

          </div>
        ) : (
          <div className="space-y-4">
            {/* Generate new model */}
            <div className="max-w-sm mx-auto bg-secondary rounded-xl p-4 border-2 border-dashed border-border space-y-3">
              <p className="text-muted-foreground font-body text-xs text-center">
                Completá tus datos para generar un modelo realista con IA
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-body text-foreground">Altura (cm)</label>
                  <input
                    type="number"
                    value={avatarData.height}
                    onChange={e => setAvatarData(d => ({ ...d, height: e.target.value }))}
                    placeholder="170"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Peso (kg)</label>
                  <input
                    type="number"
                    value={avatarData.weight}
                    onChange={e => setAvatarData(d => ({ ...d, weight: e.target.value }))}
                    placeholder="65"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Edad</label>
                  <input
                    type="number"
                    value={avatarData.age}
                    onChange={e => setAvatarData(d => ({ ...d, age: e.target.value }))}
                    placeholder="28"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Género</label>
                  <select
                    value={avatarData.gender}
                    onChange={e => setAvatarData(d => ({ ...d, gender: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                  </select>
                </div>
              </div>

              <Button variant="warm" size="sm" className="w-full" disabled={generatingAvatar} onClick={handleGenerateAvatar}>
                {generatingAvatar ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando modelo...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generar mi modelo realista</>
                )}
              </Button>
            </div>

            {/* Saved models */}
            {savedModels.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-body font-medium text-muted-foreground text-center">O elegí uno de tus modelos guardados</p>
                <div className="flex flex-wrap justify-center gap-3">
                  {savedModels.map((model) => (
                    <div
                      key={model.id}
                      className={`relative w-24 rounded-xl overflow-hidden cursor-pointer transition-all ${
                        activeModelId === model.id ? 'ring-2 ring-primary scale-105' : 'shadow-card hover:shadow-elevated'
                      }`}
                      onClick={() => selectModelMutation.mutate(model)}
                    >
                      <div className="aspect-[3/4]">
                        <img src={model.image_url} alt="Modelo guardado" className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      {model.is_active && (
                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteModelMutation.mutate(model.id);
                        }}
                        className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Select items */}
      <div className="space-y-2">
        <p className="text-sm font-body font-medium text-foreground">
          2. Elegí prendas de tu placard
          <span className="text-muted-foreground font-normal ml-1">(podés seleccionar varias)</span>
        </p>

        {/* Category filter chips */}
        {items.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter(null)}
              className={`text-xs font-body px-3 py-1 rounded-full transition-colors ${
                categoryFilter === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            {Object.entries(CATEGORIES)
              .filter(([key]) => items.some(i => i.category === key))
              .map(([key, emoji]) => (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(prev => prev === key ? null : key)}
                  className={`text-xs font-body px-3 py-1 rounded-full transition-colors ${
                    categoryFilter === key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {emoji} {key}
                </button>
              ))}
          </div>
        )}

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
              {items.filter(item => !categoryFilter || item.category === categoryFilter).map((item) => {
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

      {/* Action buttons */}
      <div className="space-y-3">
        <Button variant="warm" className="w-full" disabled={!selfie || selectedItems.length === 0 || loading} onClick={handleTryon}>
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando outfit virtual...</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Probarme {selectedItems.length > 1 ? `estas ${selectedItems.length} prendas` : 'esta prenda'}</>
          )}
        </Button>

        {resultImage && (
          <Button variant="outline" className="w-full" disabled={saving} onClick={handleSaveLook}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" /> Guardar este look</>
            )}
          </Button>
        )}
      </div>

      {/* Info */}
      <div className="bg-card rounded-xl p-4 shadow-card text-center">
        <p className="text-sm text-muted-foreground font-body">
          Seleccioná varias prendas para armar un outfit completo. La IA genera una imagen aproximada ✨
        </p>
      </div>
    </div>
  );
}
