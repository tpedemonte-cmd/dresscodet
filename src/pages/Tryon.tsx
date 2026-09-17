import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RotateCcw, X, Save, Trash2, Check, ChevronDown, Camera, Crown, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { getSubcategories, getSubcategoryLabel } from '@/lib/subcategories';
import { usePlan, LIMITS } from '@/lib/plan';
import { useNavigate } from 'react-router-dom';

import { PremiumBadge } from '@/components/PremiumGate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CATEGORIES: Record<string, string> = {
  remera: '👕', pantalon: '👖', campera: '🧥', buzo: '🧶',
  camisa: '👔', short: '🩳', vestido: '👗', pollera: '💃',
  zapatillas: '👟', zapatos: '👞', medias: '🧦', accesorio: '🎒', otro: '📦',
};

const HAIR_COLORS = ['rubio', 'castaño', 'negro', 'pelirrojo', 'canoso'];
const HAIR_STYLES = ['lacio corto', 'lacio largo', 'ondulado', 'rulos', 'recogido'];
const SKIN_TONES = ['muy clara', 'clara', 'morena', 'oscura'];
const BODY_TYPES = ['delgado', 'atlético', 'promedio', 'curvilíneo', 'robusto'];

type Look = {
  id: string;
  label: string;
  emoji: string;
  hairColor: string;
  hairStyle: string;
  skinTone: string;
  bodyType: string;
};

const HAIR_EMOJI: Record<string, string> = {
  rubio: '👱',
  castaño: '🙂',
  negro: '🧑',
  pelirrojo: '🧑‍🦰',
  canoso: '🧓',
};

const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

// Arma 4 versiones: respeta lo que el usuario aclaró y varía al azar lo que dejó vacío
const buildVariantLooks = (data: {
  hairColor: string;
  hairStyle: string;
  skinTone: string;
  bodyType: string;
}): Look[] => {
  const pick = (fixed: string, pool: string[], i: number) => {
    if (fixed) return fixed;
    return shuffle(pool)[i % pool.length];
  };
  const hairPool = shuffle(HAIR_COLORS);
  const stylePool = shuffle(HAIR_STYLES);
  const skinPool = shuffle(SKIN_TONES);
  const bodyPool = shuffle(BODY_TYPES);

  return Array.from({ length: 4 }, (_, i) => {
    const hairColor = data.hairColor || hairPool[i % hairPool.length];
    const hairStyle = data.hairStyle || stylePool[i % stylePool.length];
    const skinTone = data.skinTone || skinPool[i % skinPool.length];
    const bodyType = data.bodyType || bodyPool[i % bodyPool.length];
    const labelParts = [
      !data.hairColor ? `Pelo ${hairColor}` : null,
      !data.hairStyle ? hairStyle : null,
      !data.skinTone ? `piel ${skinTone}` : null,
      !data.bodyType ? bodyType : null,
    ].filter(Boolean) as string[];
    const label = labelParts.length > 0 ? labelParts.join(' · ') : `Opción ${i + 1}`;
    return {
      id: `v${i}`,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      emoji: HAIR_EMOJI[hairColor] || '🙂',
      hairColor,
      hairStyle,
      skinTone,
      bodyType,
    };
  });
};


// Medidas corporales usadas en la industria para el calce (Premium)
const MEASUREMENTS = [
  { key: 'chest', label: 'Pecho / busto (cm)', placeholder: '92' },
  { key: 'waist', label: 'Cintura (cm)', placeholder: '76' },
  { key: 'hips', label: 'Cadera (cm)', placeholder: '98' },
  { key: 'shoulders', label: 'Ancho de hombros (cm)', placeholder: '42' },
  { key: 'inseam', label: 'Entrepierna / largo pierna (cm)', placeholder: '78' },
  { key: 'armLength', label: 'Largo de brazo (cm)', placeholder: '60' },
  { key: 'neck', label: 'Cuello (cm)', placeholder: '37' },
  { key: 'thigh', label: 'Muslo (cm)', placeholder: '55' },
  { key: 'shoeSize', label: 'Calzado (AR)', placeholder: '39' },
] as const;

export default function Tryon() {
  const { user } = useAuth();
  const { isPremium, quota, refreshQuota } = usePlan();
  const navigatePremium = useNavigate();
  const queryClient = useQueryClient();
  const [modelMode, setModelMode] = useState<'ia' | 'selfie'>('ia');

  
  const [variants, setVariants] = useState<(Look & { image: string })[]>([]);


  const [selfie, setSelfie] = useState<string | null>(null);
  const [activeModelId, setActiveModelId] = useState<string | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingModel, setSavingModel] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState({
    height: '',
    weight: '',
    age: '',
    gender: '',
    hairColor: '',
    hairStyle: '',
    skinTone: '',
    bodyType: '',
    chest: '',
    waist: '',
    hips: '',
    shoulders: '',
    inseam: '',
    armLength: '',
    neck: '',
    thigh: '',
    shoeSize: '',
  });

  const effectiveNumber = (value: string, fallback: number) =>
    value === '' || value == null ? fallback : Number(value);

  const handleNumberChange = (key: keyof typeof avatarData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setAvatarData(d => ({ ...d, [key]: '' }));
      return;
    }
    // Evitar valores negativos: descartar el signo menos y cualquier valor < 0
    const cleaned = raw.replace(/^-/, '');
    const num = Number(cleaned);
    if (!isNaN(num) && num >= 0) {
      setAvatarData(d => ({ ...d, [key]: cleaned }));
    }
  };

  const [generatingAvatar, setGeneratingAvatar] = useState(false);

  const [showVariantPicker, setShowVariantPicker] = useState(false);

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

  // Subtipos disponibles según la categoría elegida (o todos los presentes en el placard)
  const subOptions = useMemo(() => {
    const pool = categoryFilter ? items.filter((i) => i.category === categoryFilter) : items;
    const present = new Set(pool.map((i: any) => i.subcategory).filter(Boolean) as string[]);
    if (categoryFilter) {
      return getSubcategories(categoryFilter).filter((o) => present.has(o.value));
    }
    return Array.from(present).map((v) => ({ value: v, label: getSubcategoryLabel(null, v) || v }));
  }, [items, categoryFilter]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (i: any) =>
          (!categoryFilter || i.category === categoryFilter) &&
          (!subFilter ||
            (subFilter === '__none__' ? !i.subcategory : i.subcategory === subFilter))
      ),
    [items, categoryFilter, subFilter]
  );


  const handleSelfieUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setSelfie(reader.result as string);
      setActiveModelId(null);
      setResultImage(null);
      toast.success('¡Foto lista! Elegí prendas para probártelas.');
    };
    reader.readAsDataURL(file);
  };

  const buildAvatarBody = (overrides: Partial<typeof avatarData> = {}) => {
    const d = { ...avatarData, ...overrides };
    return {
      height: effectiveNumber(d.height, 170),
      weight: effectiveNumber(d.weight, 65),
      age: effectiveNumber(d.age, 28),
      gender: d.gender,
      ...(isPremium
        ? {
            hairColor: d.hairColor,
            hairStyle: d.hairStyle,
            skinTone: d.skinTone,
            bodyType: d.bodyType,
            measurements: Object.fromEntries(
              MEASUREMENTS.map((m) => [m.key, (d as any)[m.key]]).filter(
                ([, v]) => v !== '' && v != null
              )
            ),
          }
        : {}),
    };
  };

  const handleGenerateAvatar = async () => {
    const { gender } = avatarData;
    if (!gender) {
      toast.error('Seleccioná un género para continuar');
      return;
    }
    if (quota.avatarsLeft <= 0) {
      if (isPremium) {
        toast.error(
          `Llegaste al límite de modelos (${LIMITS.premium.avatarsPerDay} por día, ${LIMITS.premium.avatarsPerMonth} por mes). Probá más tarde.`,
        );
      } else {
        toast.error('Ya usaste tu modelo gratis. Sumá avatares para armar otro.');
        navigatePremium('/premium');
      }
      return;
    }
    setGeneratingAvatar(true);
    setVariants([]);

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const generateOne = async (overrides: Partial<typeof avatarData> = {}) => {
      // La IA de imágenes tiene límite de pedidos por minuto: reintentamos con espera
      let lastError: any = null;
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase.functions.invoke('generate-avatar', {
          body: buildAvatarBody(overrides),
        });
        if (!error && !data?.error && data?.image) return data.image as string;
        lastError = error || new Error(data?.error || 'No se pudo generar el modelo');
        const msg = String(lastError?.message || '');
        const rateLimited = /429|non-2xx|rate|límite|limite/i.test(msg);
        if (!rateLimited || attempt === 3) break;
        await sleep(4000 * (attempt + 1));
      }
      throw new Error(
        /429|non-2xx/i.test(String(lastError?.message || ''))
          ? 'La IA está recibiendo demasiados pedidos. Esperá unos segundos y volvé a intentar.'
          : lastError?.message || 'No se pudo generar el modelo'
      );
    };

    try {
      if (isPremium) {
        // Respetamos lo que el usuario aclaró y variamos al azar lo que dejó vacío
        const looks = buildVariantLooks(avatarData).slice(0, Math.max(1, quota.avatarsLeft));
        // De a uno y con pausa, para no pasarnos del límite de pedidos por minuto
        const ok: (Look & { image: string })[] = [];
        let firstError: any = null;
        for (let i = 0; i < looks.length; i++) {
          const look = looks[i];
          try {
            const image = await generateOne({
              hairColor: look.hairColor,
              hairStyle: look.hairStyle,
              skinTone: look.skinTone,
              bodyType: look.bodyType,
            });
            ok.push({ ...look, image });
            setVariants([...ok]);
          } catch (e: any) {
            if (!firstError) firstError = e;
          }
          if (i < looks.length - 1) await sleep(2500);
        }
        if (ok.length === 0) {
          throw new Error(firstError?.message || 'No se pudieron generar los modelos');
        }
        setVariants(ok);
        setActiveModelId(null);
        setResultImage(null);
        toast.success(`Se generaron ${ok.length} modelos. Elegí con cuál te identificás.`);

      } else {
        const image = await generateOne();
        setSelfie(image);
        setActiveModelId(null);
        setResultImage(null);
        toast.success('¡Modelo generado! Ahora podés guardarlo.');
      }
    } catch (err: any) {
      console.error('Avatar error:', err);
      toast.error(err.message || 'Error al generar el modelo');
    } finally {
      setGeneratingAvatar(false);
      refreshQuota();
    }
  };

  const chooseVariant = (v: Look & { image: string }) => {
    setAvatarData((d) => ({
      ...d,
      hairColor: v.hairColor,
      hairStyle: v.hairStyle,
      skinTone: v.skinTone,
      bodyType: v.bodyType,
    }));
    setSelfie(v.image);
    setShowVariantPicker(false);
    setResultImage(null);
    toast.success('¡Listo! Ya podés probarte prendas con este modelo.');
  };

  const saveModelMutation = useMutation({
    mutationFn: async () => {
      // Guardamos la imagen que se está viendo: si hay resultado de IA (con la ropa puesta), esa
      const source = resultImage || selfie;
      if (!source || !user) throw new Error('No hay modelo para guardar');
      if (savedModels.length >= quota.savedModelsLimit) {
        throw new Error(
          isPremium
            ? `Podés guardar hasta ${quota.savedModelsLimit} modelos. Borrá uno para guardar este.`
            : 'El plan gratis guarda 1 modelo. Borrá el que tenés o sumá avatares desde Premium.',
        );
      }
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
          height: effectiveNumber(avatarData.height, 170),
          weight: effectiveNumber(avatarData.weight, 65),
          age: effectiveNumber(avatarData.age, 28),
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
      refreshQuota();
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
      setAvatarData((d) => ({
        ...d,
        height: String(model.height),
        weight: String(model.weight),
        age: String(model.age),
        gender: model.gender,
      }));
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
      refreshQuota();
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
        refreshQuota();
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
    setVariants([]);
    setShowVariantPicker(false);
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

        {!selfie && (
          <div className="max-w-sm mx-auto grid grid-cols-2 gap-2">
            <button
              onClick={() => setModelMode('ia')}
              className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-body font-medium transition-colors ${
                modelMode === 'ia' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sparkles className="h-4 w-4" /> Con IA
            </button>
            <button
              onClick={() => setModelMode('selfie')}
              className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-body font-medium transition-colors ${
                modelMode === 'selfie' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              {isPremium ? <Camera className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />} Mi foto
            </button>
          </div>
        )}


        {selfie && !showVariantPicker ? (
          <div className="space-y-3">
            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-card">
              <img src={resultImage || selfie} alt="Tu modelo" className="w-full h-full object-cover" />
              {resultImage && (
                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-body font-medium px-2 py-1 rounded-full">
                  ✨ Resultado IA
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              <Button
                variant="outline"
                disabled={savingModel}
                onClick={() => saveModelMutation.mutate()}
              >
                {savingModel ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando modelo...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> {resultImage ? 'Guardar modelo con esta ropa' : 'Guardar este modelo'}</>
                )}
              </Button>
              {variants.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setShowVariantPicker(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Cambiar modelo
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={reset}
              >
                Volver a los datos
              </Button>
            </div>

          </div>
        ) : (
          <div className="space-y-4">
            {variants.length > 0 && (showVariantPicker || !selfie) ? (
              <div className="space-y-3">
                <p className="text-sm font-body font-medium text-foreground text-center">
                  Elegí el modelo con el que más te identificás
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => chooseVariant(v)}
                      className="rounded-xl overflow-hidden bg-secondary shadow-card hover:shadow-elevated hover:ring-2 hover:ring-primary transition-all text-left"
                    >
                      <img src={v.image} alt={v.label} className="w-full aspect-[3/4] object-cover" />
                      <p className="text-[11px] font-body text-center py-1 text-foreground">
                        {v.emoji} {v.label}
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {selfie && (
                    <Button variant="outline" size="sm" onClick={() => setShowVariantPicker(false)}>
                      Volver al modelo actual
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={reset}>
                    Volver a los datos
                  </Button>
                  <Button variant="warm" size="sm" disabled={generatingAvatar} onClick={handleGenerateAvatar}>
                    {generatingAvatar ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando...</>
                    ) : (
                      <><RotateCcw className="h-4 w-4 mr-2" /> Generar otras opciones</>
                    )}
                  </Button>
                </div>
              </div>
            ) : modelMode === 'selfie' ? (
              isPremium ? (
                <div className="max-w-sm mx-auto bg-secondary rounded-xl p-4 border-2 border-dashed border-border space-y-3 text-center">
                  <p className="text-muted-foreground font-body text-xs">
                    Sacate una foto de cuerpo completo y probate la ropa sobre tu propia imagen
                  </p>
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelfieUpload(file);
                      }}
                    />
                    <span className="inline-flex items-center justify-center gap-2 w-full cursor-pointer rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-body font-medium">
                      <Camera className="h-4 w-4" /> Sacar o subir mi foto
                    </span>
                  </label>
                </div>
              ) : (
                <div className="max-w-sm mx-auto bg-card rounded-xl p-4 shadow-card space-y-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-body font-medium text-foreground">Probártelo con tu propia foto</p>
                    <PremiumBadge />
                  </div>
                  <p className="text-xs font-body text-muted-foreground">
                    Con Premium podés sacarte una foto y ver cómo te queda la ropa en tu cuerpo real.
                  </p>
                  <Button variant="warm" size="sm" onClick={() => navigatePremium('/premium')}>
                    <Crown className="h-4 w-4 mr-2" /> Pasar a Premium
                  </Button>
                </div>
              )
            ) : (
            <div className="max-w-sm mx-auto bg-secondary rounded-xl p-4 border-2 border-dashed border-border space-y-3">
              <p className="text-muted-foreground font-body text-xs text-center">
                Completá tus datos para generar un modelo realista con IA
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-body text-foreground">Altura (cm)</label>
                  <input
                    type="number"
                    min="0"
                    value={avatarData.height}
                    onChange={handleNumberChange('height')}
                    placeholder="170"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Peso (kg)</label>
                  <input
                    type="number"
                    min="0"
                    value={avatarData.weight}
                    onChange={handleNumberChange('weight')}
                    placeholder="65"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Edad</label>
                  <input
                    type="number"
                    min="0"
                    value={avatarData.age}
                    onChange={handleNumberChange('age')}
                    placeholder="28"
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background placeholder:text-muted-foreground/60"
                  />
                </div>
                <div>
                  <label className="text-xs font-body text-foreground">Género</label>
                  <select
                    value={avatarData.gender}
                    onChange={e => setAvatarData(d => ({ ...d, gender: e.target.value }))}
                    className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                  >
                    <option value="">Seleccioná uno</option>
                    <option value="femenino">Femenino</option>
                    <option value="masculino">Masculino</option>
                  </select>
                </div>
              </div>

              {/* Datos avanzados (Premium) */}
              {isPremium ? (
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: 'hairColor', label: 'Color de pelo', options: HAIR_COLORS },
                    { key: 'hairStyle', label: 'Tipo de pelo', options: HAIR_STYLES },
                    { key: 'skinTone', label: 'Tono de piel', options: SKIN_TONES },
                    { key: 'bodyType', label: 'Contextura', options: BODY_TYPES },
                  ] as const).map((f) => (
                    <div key={f.key}>
                      <label className="text-xs font-body text-foreground">{f.label}</label>
                      <select
                        value={(avatarData as any)[f.key]}
                        onChange={e => { setAvatarData(d => ({ ...d, [f.key]: e.target.value })); }}
                        className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                      >
                        <option value="">Sin preferencia</option>
                        {f.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => navigatePremium('/premium')}
                  className="w-full rounded-lg bg-background/70 border border-dashed border-border px-3 py-2 text-[11px] font-body text-muted-foreground hover:text-foreground"
                >
                  <Lock className="h-3.5 w-3.5 inline mr-1" /> Pelo, piel, contextura y tus medidas — Premium
                </button>
              )}

              {/* Medidas corporales (Premium) */}
              {isPremium && (
                <div className="space-y-2 rounded-lg bg-background/60 p-3">
                  <p className="text-xs font-body font-medium text-foreground">
                    Tus medidas (opcional, para un calce más realista)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {MEASUREMENTS.map((m) => (
                      <div key={m.key}>
                        <label className="text-xs font-body text-foreground">{m.label}</label>
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={(avatarData as any)[m.key]}
                          onChange={handleNumberChange(m.key as keyof typeof avatarData)}
                          placeholder={m.placeholder}
                          className="w-full mt-1 px-2 py-1.5 text-sm rounded-md border border-input bg-background"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] font-body text-muted-foreground">
                    Todas en centímetros. Las que dejes vacías se estiman con tu altura y peso.
                  </p>
                </div>
              )}

              <Button variant="warm" size="sm" className="w-full" disabled={generatingAvatar} onClick={handleGenerateAvatar}>
                {generatingAvatar ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando modelo...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Generar mi modelo realista</>
                )}
              </Button>
            </div>
            )}


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
              onClick={() => { setCategoryFilter(null); setSubFilter(null); }}
              className={`text-xs font-body px-3 py-1 rounded-full transition-colors ${
                categoryFilter === null ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              Todas
            </button>
            {Object.entries(CATEGORIES)
              .filter(([key]) => items.some(i => i.category === key))
              .map(([key, emoji]) => {
                const presentSubsForCat = new Set(
                  items.filter((i) => i.category === key).map((i: any) => i.subcategory).filter(Boolean) as string[]
                );
                const definedSubs = getSubcategories(key);
                const subsForCat = definedSubs.length > 0 ? definedSubs : [];
                const isActive = categoryFilter === key;

                if (subsForCat.length === 0) {
                  return (
                    <button
                      key={key}
                      onClick={() => { setCategoryFilter(prev => prev === key ? null : key); setSubFilter(null); }}
                      className={`text-xs font-body px-3 py-1 rounded-full transition-colors ${
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {emoji} {key}
                    </button>
                  );
                }

                return (
                  <DropdownMenu key={key}>
                    <DropdownMenuTrigger asChild>
                      <button
                        className={`inline-flex items-center gap-1 text-xs font-body px-3 py-1 rounded-full transition-colors ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {isActive && subFilter
                          ? `${emoji} ${subFilter === '__none__' ? 'Sin clasificar' : getSubcategoryLabel(key, subFilter)}`
                          : `${emoji} ${key}`}
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="bg-popover z-50">
                      <DropdownMenuItem onClick={() => { setCategoryFilter(key); setSubFilter(null); }}>
                        <span className="flex-1">Todas</span>
                        {isActive && !subFilter && <Check className="h-3.5 w-3.5 ml-2" />}
                      </DropdownMenuItem>
                      {subsForCat.map((o) => {
                        const hasItems = presentSubsForCat.has(o.value);
                        return (
                          <DropdownMenuItem
                            key={o.value}
                            disabled={!hasItems}
                            onClick={() => { setCategoryFilter(key); setSubFilter(o.value); }}
                            className={hasItems ? '' : 'opacity-50'}
                          >
                            <span className="flex-1">{o.label}</span>
                            {isActive && subFilter === o.value && <Check className="h-3.5 w-3.5 ml-2" />}
                          </DropdownMenuItem>
                        );
                      })}
                      {items.some((i) => i.category === key && !i.subcategory) && (
                        <DropdownMenuItem
                          onClick={() => { setCategoryFilter(key); setSubFilter('__none__'); }}
                        >
                          <span className="flex-1 italic">Sin clasificar</span>
                          {isActive && subFilter === '__none__' && <Check className="h-3.5 w-3.5 ml-2" />}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              })}
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
        ) : visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground font-body">No hay prendas con esos filtros.</p>
        ) : (
          <div className="max-h-[26rem] overflow-y-auto rounded-xl bg-secondary/40 p-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {visibleItems.map((item: any) => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                const subLabel = getSubcategoryLabel(item.category, item.subcategory);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    className={`rounded-xl overflow-hidden bg-card text-left transition-all relative ${
                      isSelected
                        ? 'ring-2 ring-primary shadow-elevated'
                        : 'shadow-card hover:shadow-elevated'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 z-10 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    <div className="aspect-square">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-body font-medium text-foreground truncate">
                        {CATEGORIES[item.category] || '📦'} {item.name}
                      </p>
                      {subLabel && (
                        <p className="text-[11px] font-body text-muted-foreground truncate">{subLabel}</p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
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
