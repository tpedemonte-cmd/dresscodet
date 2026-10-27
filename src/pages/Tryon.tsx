import IconText from '@/components/IconText';
import { useState, useMemo, useEffect, useRef } from 'react';
import ItemLightbox from '@/components/ItemLightbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cloudFunctions } from '@/lib/cloudFunctions';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, RotateCcw, X, Save, Trash2, Check, ChevronDown, Camera, Crown, Lock, Plus, Images, Maximize2 } from 'lucide-react';
import { toast } from 'sonner';
import { toggleOutfitItem } from '@/lib/tryonSelection';
import { useTryonDraftState } from '@/lib/tryonDraft';
import { getSubcategories, getSubcategoryLabel } from '@/lib/subcategories';
import { usePlan, LIMITS } from '@/lib/plan';
import { useNavigate } from 'react-router-dom';
import { trimImage, useTrimmedImage, useIsLandscape } from '@/lib/trimImage';
import { AVATAR_MIN_HEIGHT_CM, AVATAR_MIN_WEIGHT_KG, canDeleteAvatar, canUseOwnPhoto, isAvatarHeightValid, isAvatarWeightValid, isSavedAvatarSelected, needsLastAvatarConfirmation, needsLastAvatarDeletionConfirmation } from '../../supabase/functions/_shared/avatarRules';
import { fileToUprightPhoto } from '@/lib/uprightPhoto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import { PremiumBadge } from '@/components/PremiumGate';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const CATEGORIES: Record<string, string> = {
  remera: '👕', pantalon: '👖', campera: '🧥', buzo: '🧶', sweater: '🥼',
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
  const { isPremium, quota, quotaLoading, quotaError, loading: planLoading, refreshQuota, recordSuccessfulTryon } = usePlan();
  const navigatePremium = useNavigate();
  const queryClient = useQueryClient();
  const useDraftState = <T,>(field: string, initial: T) => useTryonDraftState(user?.id ?? '', field, initial);
  const [modelMode, setModelMode] = useDraftState<'ia' | 'selfie'>('modelMode', 'ia');
  const [confirmLastAvatar, setConfirmLastAvatar] = useState(false);
  const [avatarToDelete, setAvatarToDelete] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  
  const [variants, setVariants] = useDraftState<(Look & { image: string })[]>('variants', []);


  const [selfie, setSelfie] = useDraftState<string | null>('selfie', null);
  const [activeModelId, setActiveModelId] = useDraftState<string | null>('activeModelId', null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [photoSourceOpen, setPhotoSourceOpen] = useState(false);
  const [avatarBeforePhoto, setAvatarBeforePhoto] = useDraftState<{ image: string; id: string | null } | null>('avatarBeforePhoto', null);
  const [selectedItems, setSelectedItems] = useDraftState<any[]>('selectedItems', []);
  const [resultImage, setResultImage] = useDraftState<string | null>('resultImage', null);
  const [resultItems, setResultItems] = useDraftState<any[]>('resultItems', []);
  const { url: modelImage } = useTrimmedImage(selfie);
  const { url: resultImageTrimmed } = useTrimmedImage(resultImage);
  // El outfit generado se ve en el marco hasta que empezás a elegir otras prendas
  const showResultInFrame = !!resultImage && selectedItems.length === 0;
  const frameImage = showResultInFrame ? resultImageTrimmed || resultImage : modelImage || selfie;
  const frameIsWide = useIsLandscape(showResultInFrame ? frameImage : null);

  const [loading, setLoading] = useDraftState('loading', false);
  const [saving, setSaving] = useDraftState('saving', false);
  const [savingModel, setSavingModel] = useDraftState('savingModel', false);
  const [categoryFilter, setCategoryFilter] = useDraftState<string | null>('categoryFilter', null);
  const [subFilter, setSubFilter] = useDraftState<string | null>('subFilter', null);
  const [avatarData, setAvatarData] = useDraftState('avatarData', {
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

  const [generatingAvatar, setGeneratingAvatar] = useDraftState('generatingAvatar', false);

  const [showVariantPicker, setShowVariantPicker] = useDraftState('showVariantPicker', false);

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

  const { data: savedModels = [], isLoading: modelsLoading } = useQuery({
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

  const canDeleteModel = !planLoading && !quotaLoading && canDeleteAvatar(isPremium, quota.avatarCredits);
  const avatarAvailable = quota.avatarCredits + (!selfie && variants.length === 0 && quota.avatarsTotal === 0 ? 1 : 0);
  // The frame shows a saved avatar even when the draft lost its id (e.g. after a free generation was auto-saved).
  const frameModelId = activeModelId
    ?? (modelMode !== 'selfie' && !avatarBeforePhoto && selfie
      ? (savedModels.find((m) => m.image_url === selfie) ?? (variants.length === 0 ? savedModels[0] : undefined))?.id ?? null
      : null);

  // El outfit solo se genera con el avatar ya guardado (o con foto propia)
  const usingSavedAvatar = isSavedAvatarSelected(
    selfie,
    savedModels.map((m) => m.image_url),
    canUseOwnPhoto(isPremium, modelMode)
  );


  useEffect(() => {
    if (selfie || variants.length > 0 || modelsLoading) return;
    const model = savedModels.find((m) => m.is_active) ?? savedModels[0];
    if (!model) return;
    setSelfie(model.image_url);
    setActiveModelId(model.id);
    setAvatarData((d) => ({ ...d, height: String(model.height), weight: String(model.weight), age: String(model.age), gender: model.gender }));
  }, [selfie, variants.length, modelsLoading, savedModels]);

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


  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);

  // La foto propia se guarda como modelo fijo y descuenta una generación de avatar,
  // igual que un avatar generado con IA (gratis inicial o crédito comprado).
  const handleSelfieUpload = async (file: File, lastAvatarConfirmed = false) => {
    if (savingPhoto || quotaLoading || modelsLoading || planLoading) return;
    if (!quotaError && quota.avatarsLeft <= 0) {
      toast.error('Ya usaste tu generación inicial. Comprá un pack para armar otro avatar.');
      navigatePremium('/premium#avatares-extra');
      return;
    }
    if (!quotaError && !lastAvatarConfirmed && needsLastAvatarConfirmation(quota.avatarsLeft)) {
      setPendingPhotoFile(file);
      setConfirmLastAvatar(true);
      return;
    }
    setConfirmLastAvatar(false);
    setPendingPhotoFile(null);
    setSavingPhoto(true);
    try {
      // La foto del teléfono viene torcida en sus pixels (con una marca EXIF que la IA ignora):
      // se re-codifica bien parada y más liviana antes de usarla.
      const photo = await fileToUprightPhoto(file);
      const { data, error } = await cloudFunctions.invoke('save-photo-model', {
        body: { ...buildAvatarBody(), gender: avatarData.gender || 'otro', imageBase64: photo },
      });
      if (error || data?.error) throw new Error(data?.error || 'No se pudo guardar tu modelo');
      const model = data?.model;
      if (!model?.image_url) throw new Error('No se pudo guardar tu modelo');
      if (selfie && !avatarBeforePhoto) setAvatarBeforePhoto({ image: selfie, id: activeModelId });
      setSelfie(model.image_url);
      setActiveModelId(model.id);
      setModelMode('selfie');
      setShowVariantPicker(false);
      setResultImage(null);
      queryClient.invalidateQueries({ queryKey: ['user_models'] });
      refreshQuota();
      toast.success('¡Foto lista! Quedó guardada como tu modelo. Elegí prendas para probártelas.');
    } catch (err: any) {
      console.error('Photo model error:', err);
      toast.error(err.message || 'Error al guardar tu modelo');
      refreshQuota();
    } finally {
      setSavingPhoto(false);
    }
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

  const handleGenerateAvatar = async (lastAvatarConfirmed = false) => {
    if (generatingAvatar || quotaLoading || modelsLoading || planLoading) return;
    if (savedModels.length > 0 || selfie || variants.length > 0) {
      toast.error('Guardá tu modelo o eliminá el actual con un avatar extra antes de generar otro.');
      return;
    }
    const { gender } = avatarData;
    if (!gender) {
      toast.error('Seleccioná un género para continuar');
      return;
    }
    if (!isAvatarHeightValid(avatarData.height)) {
      toast.error(`La altura mínima es ${AVATAR_MIN_HEIGHT_CM} cm`);
      return;
    }
    if (!isAvatarWeightValid(avatarData.weight)) {
      toast.error(`El peso mínimo es ${AVATAR_MIN_WEIGHT_KG} kg`);
      return;
    }
    // Si no se pudieron leer los cupos, el servidor decide si corresponde generar.
    if (!quotaError && quota.avatarsLeft <= 0) {
      toast.error('Ya usaste tu generación inicial. Comprá un pack para armar otro avatar.');
      navigatePremium('/premium#avatares-extra');
      return;
    }
    if (!quotaError && !lastAvatarConfirmed && needsLastAvatarConfirmation(quota.avatarsLeft)) {
      setConfirmLastAvatar(true);
      return;
    }
    setConfirmLastAvatar(false);
    setGeneratingAvatar(true);
    setVariants([]);

    try {
      const { data, error } = await cloudFunctions.invoke('generate-avatar', {
        body: buildAvatarBody(),
      });
      if (error || data?.error) throw new Error(data?.error || 'No se pudo generar el modelo');
      const images: string[] = data?.images ?? (data?.image ? [data.image] : []);
      if (!images.length) throw new Error('No se pudo generar el modelo');
      setActiveModelId(null);
      setResultImage(null);
      if (isPremium) {
        setVariants(images.map((image, i) => ({
          id: `v${i}`, label: `Opción ${i + 1}`, emoji: '🙂', image,
          hairColor: avatarData.hairColor, hairStyle: avatarData.hairStyle,
          skinTone: avatarData.skinTone, bodyType: avatarData.bodyType,
        })));
        setShowVariantPicker(true);
        toast.success('Elegí uno de los tres modelos para guardar.');
      } else {
        setSelfie(images[0]);
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
      const rawSource = selfie;
      if (!rawSource || !user) throw new Error('No hay modelo para guardar');
      // Guardamos la imagen recortada (sin fondo vacío) para que siempre llene el marco
      let source = rawSource;
      try {
        source = await trimImage(rawSource);
      } catch {
        source = rawSource;
      }
      if (savedModels.length >= quota.savedModelsLimit) {
        throw new Error('Solo podés guardar un modelo. Comprá un pack para reemplazarlo.');
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
      setSelfie(data.image_url);
      setVariants([]);
      setShowVariantPicker(false);
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
      if (!canDeleteModel) throw new Error('Necesitás un avatar extra disponible para eliminar este modelo.');
      const { data, error } = await supabase.from('user_models').delete().eq('id', id).select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('No se pudo eliminar el modelo.');
    },
    onSuccess: (_, id) => {
      setAvatarToDelete(null);
      if (avatarBeforePhoto?.id === id) setAvatarBeforePhoto(null);
      if (activeModelId === id) {
        setSelfie(null);
        setActiveModelId(null);
        setResultImage(null);
        setVariants([]);
        setShowVariantPicker(false);
      }
      queryClient.setQueryData(['user_models', user?.id], (models: typeof savedModels | undefined) => models?.filter((model) => model.id !== id));
      queryClient.invalidateQueries({ queryKey: ['user_models'] });
      refreshQuota();
      toast.success('Modelo eliminado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const requestDeleteModel = (id: string) => {
    if (!canDeleteModel || modelsLoading || deleteModelMutation.isPending) return;
    if (needsLastAvatarDeletionConfirmation(isPremium, savedModels.length, quota.avatarCredits)) {
      setAvatarToDelete(id);
      return;
    }
    deleteModelMutation.mutate(id);
  };

  const toggleItem = (item: any) => {
    setSelectedItems(prev => toggleOutfitItem(prev, item));
  };

  const removeItem = (id: string) => {
    setSelectedItems(prev => prev.filter(i => i.id !== id));
  };


  const handleTryon = async () => {
    if (!selfie) {
      toast.error('Generá tu modelo y guardalo primero');
      return;
    }
    if (!usingSavedAvatar) {
      toast.error('Guardá el modelo primero');
      return;
    }
    if (selectedItems.length === 0) {
      toast.error('Elegí al menos una prenda para probarte');
      return;
    }
    if (quotaLoading || planLoading) {
      toast.error('Esperá a que se actualicen tus cupos.');
      return;
    }
    if (!quota.canGenerateTryon) {
      navigatePremium('/premium#outfits-extra');
      return;
    }

    setLoading(true);
    setResultImage(null);

    try {
      const { data, error } = await cloudFunctions.invoke('virtual-tryon', {
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
      if (data?.quota_exceeded) {
        toast.error(data.error, {
          action: { label: 'Comprar outfits extra', onClick: () => navigatePremium('/premium#outfits-extra') },
        });
        refreshQuota();
        return;
      }
      if (data?.error) throw new Error(data.error);

      if (data?.image) {
        await recordSuccessfulTryon(data.used_credit === true);
        setResultImage(data.image);
        setResultItems(selectedItems);
        setSelectedItems([]);
        toast.success('¡Mirá cómo te queda el outfit! Ya podés elegir otras prendas para el siguiente');

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

      const lookSource = resultItems.length ? resultItems : selectedItems;
      const itemNames = lookSource.map(i => `${CATEGORIES[i.category] || '📦'} ${i.name}`).join(', ');


      const { error: insertError } = await supabase.from('saved_looks').insert({
        user_id: user.id,
        image_url: urlData.publicUrl,
        item_ids: lookSource.map(i => i.id),

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


  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {isPremium && (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            aria-label="Sacarte una foto con la cámara"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSelfieUpload(file);
              e.target.value = '';
            }}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            aria-label="Elegir una foto de tu galería"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleSelfieUpload(file);
              e.target.value = '';
            }}
          />
          <Drawer open={photoSourceOpen} onOpenChange={setPhotoSourceOpen}>
            <DrawerContent className="max-w-sm mx-auto">
              <DrawerHeader className="text-center">
                <DrawerTitle>¿Cómo querés subir tu foto?</DrawerTitle>
                <DrawerDescription>Elegí si te sacás una foto ahora o usás una de tu galería.</DrawerDescription>
              </DrawerHeader>
              <div className="px-4 pb-28 flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setPhotoSourceOpen(false);
                    requestAnimationFrame(() => cameraInputRef.current?.click());
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" /> Abrir la cámara
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setPhotoSourceOpen(false);
                    requestAnimationFrame(() => galleryInputRef.current?.click());
                  }}
                >
                  <Images className="h-4 w-4 mr-2" /> Elegir de la galería
                </Button>
              </div>
            </DrawerContent>
          </Drawer>
        </>
      )}
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
            {isPremium && (
              <div className="max-w-sm mx-auto flex gap-2">
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={loading || generatingAvatar || savingPhoto}
                  onClick={() => setPhotoSourceOpen(true)}
                >
                  {savingPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />} O sacarte una foto
                </Button>
                {avatarBeforePhoto && (
                  <Button
                    variant="secondary"
                    disabled={loading}
                    onClick={() => {
                      setSelfie(avatarBeforePhoto.image);
                      setActiveModelId(avatarBeforePhoto.id);
                      setAvatarBeforePhoto(null);
                      setModelMode('ia');
                      setResultImage(null);
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Volver a mi avatar
                  </Button>
                )}
              </div>
            )}
            <div className="relative w-full max-w-sm mx-auto aspect-[3/4] rounded-xl overflow-hidden shadow-card bg-muted">
              <img
                src={frameImage || selfie || ''}
                alt="Tu modelo"
                className={`w-full h-full block ${frameIsWide ? 'object-contain' : 'object-cover object-center'} cursor-zoom-in`}
                onClick={() => setLightboxSrc(frameImage || selfie || '')}
                aria-label="Ver avatar en pantalla completa"
              />
              {showResultInFrame && (

                <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-body font-medium px-2 py-1 rounded-full"><IconText text={"✨ Resultado IA"} /></div>
              )}
              {frameModelId && (
                <Button variant="outline" size="icon"
                  onClick={() => navigatePremium('/premium#avatares-extra')}
                  aria-label="Comprar avatares extra para modificar tu modelo"
                  className="absolute top-2 right-2 h-9 w-9 rounded-full bg-background/80 text-foreground backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              )}
              {frameModelId && (
                <Button variant="destructive" size="icon"
                  onClick={() => {
                    if (!canDeleteModel) {
                      toast.error('Para eliminar tu modelo necesitás un avatar extra.');
                      navigatePremium('/premium#avatares-extra');
                      return;
                    }
                    requestDeleteModel(frameModelId);
                  }}
                  disabled={deleteModelMutation.isPending}
                  aria-label="Eliminar modelo actual"
                  className="absolute top-14 right-2 h-9 w-9 rounded-full bg-destructive text-destructive-foreground backdrop-blur-sm flex items-center justify-center transition-colors disabled:opacity-60"
                >
                  {deleteModelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2 max-w-sm mx-auto">
              {!activeModelId && savedModels.length === 0 && <Button
                variant="outline"
                disabled={savingModel}
                onClick={() => saveModelMutation.mutate()}
              >
                {savingModel ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Guardando modelo...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> Guardar modelo</>
                )}
              </Button>}
              {isPremium && !activeModelId && !avatarBeforePhoto && variants.length > 0 && (
                <Button
                  variant="secondary"
                  onClick={() => setShowVariantPicker(true)}
                >
                  <RotateCcw className="h-4 w-4 mr-2" /> Cambiar modelo
                </Button>
              )}

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
                        <IconText text={v.emoji} /> {v.label}
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
                </div>
              </div>
            ) : modelMode === 'selfie' ? (
              isPremium ? (
                <div className="max-w-sm mx-auto bg-secondary rounded-xl p-4 border-2 border-dashed border-border space-y-3 text-center">
                  <p className="text-muted-foreground font-body text-xs">
                    Sacate una foto de cuerpo completo y probate la ropa sobre tu propia imagen
                  </p>
                  <Button className="w-full" disabled={loading || generatingAvatar || savingPhoto} onClick={() => setPhotoSourceOpen(true)}>
                    {savingPhoto ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Camera className="h-4 w-4 mr-2" />} Sacar o subir mi foto
                  </Button>
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
                    min="150"
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
                    min="45"
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
                      <label className="text-xs font-body text-foreground"><IconText text={f.label} /></label>
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
                <Button variant="outline"
                  onClick={() => navigatePremium('/premium')}
                  className="w-full rounded-lg bg-background/70 border border-dashed border-border px-3 py-2 text-[11px] font-body text-muted-foreground hover:text-foreground"
                >
                  <Lock className="h-3.5 w-3.5 inline mr-1" /> Pelo, piel, contextura y tus medidas — Premium
                </Button>
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
              {quota.avatarsTotal === 0 && (
                <div className="rounded-xl bg-secondary p-3">
                  <p className="text-[11px] font-body text-muted-foreground">
                    {isPremium ? 'Una generación inicial con 3 opciones. Elegí un solo modelo.' : 'Un modelo inicial gratis.'}
                  </p>
                </div>
              )}

              <Button
                variant="warm"
                size="sm"
                className="w-full"
                disabled={generatingAvatar || quotaLoading || modelsLoading || planLoading || (!quotaError && quota.avatarsLeft <= 0) || (savedModels.length > 0 || variants.length > 0)}
                onClick={() => void handleGenerateAvatar()}
              >
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
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Ver modelo en pantalla completa"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxSrc(model.image_url);
                        }}
                        className="absolute top-1 left-1 bg-background/80 backdrop-blur-sm rounded-full p-1"
                      >
                        <Maximize2 className="h-3 w-3 text-foreground" />
                      </Button>
                      {canDeleteModel && <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Eliminar modelo guardado"
                        disabled={deleteModelMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          requestDeleteModel(model.id);
                        }}
                        className="absolute bottom-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-sm font-body text-muted-foreground" aria-live="polite">
          Avatares disponibles: <span className="font-semibold text-foreground">{quotaLoading ? '…' : quotaError ? '—' : avatarAvailable}</span>
        </p>
        {quotaError && (
          <button type="button" className="text-xs font-body text-primary underline" onClick={() => refreshQuota()}>
            No pudimos cargar tus avatares. Reintentar
          </button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full max-w-sm"
          onClick={() => navigatePremium('/premium#avatares-extra')}
        >
          <Plus className="h-4 w-4 mr-2" /> Comprar avatares extra
        </Button>
      </div>

      <Dialog open={avatarToDelete !== null} onOpenChange={(open) => {
        if (!open && !deleteModelMutation.isPending) setAvatarToDelete(null);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Estás eliminando el último avatar que tenés, ¿estás seguro de que querés continuar?</DialogTitle>
            <DialogDescription>Te quedarás sin avatar guardado. Para generar otro vas a necesitar un pack de avatares extra; también podés usar tu propia foto.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" disabled={deleteModelMutation.isPending} onClick={() => setAvatarToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" className="flex-1" disabled={deleteModelMutation.isPending || !canDeleteModel} onClick={() => {
              if (avatarToDelete) deleteModelMutation.mutate(avatarToDelete);
            }}>
              {deleteModelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sí, eliminar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmLastAvatar} onOpenChange={(open) => {
        setConfirmLastAvatar(open);
        if (!open) setPendingPhotoFile(null);
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Estás usando tu último avatar, querés continuar?</DialogTitle>
            <DialogDescription>Si se genera correctamente, se descontará un avatar y conservarás ese último modelo.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => { setConfirmLastAvatar(false); setPendingPhotoFile(null); }}>Cancelar</Button>
            <Button className="flex-1" disabled={generatingAvatar || savingPhoto || quotaLoading} onClick={() => {
              const file = pendingPhotoFile;
              setConfirmLastAvatar(false);
              if (file) void handleSelfieUpload(file, true);
              else void handleGenerateAvatar(true);
            }}>Continuar</Button>
          </div>
        </DialogContent>
      </Dialog>

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
                      <IconText text={emoji} /> {key}
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
                        <IconText text={isActive && subFilter
                          ? `${emoji} ${subFilter === '__none__' ? 'Sin clasificar' : getSubcategoryLabel(key, subFilter)}`
                          : `${emoji} ${key}`} />
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
                <IconText text={CATEGORIES[item.category] || '📦'} /> <IconText text={item.name} />
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
          <div className="rounded-xl bg-secondary/40 p-3 -mx-1">
            <div className="flex flex-col gap-3 overflow-y-auto max-h-[420px] snap-y snap-mandatory pb-2 px-1 sm:grid sm:grid-cols-4 lg:grid-cols-5 sm:snap-none sm:max-h-96">
              {visibleItems.map((item: any) => {
                const isSelected = selectedItems.some(i => i.id === item.id);
                const subLabel = getSubcategoryLabel(item.category, item.subcategory);
                return (
                  <Button
                    variant="ghost"
                    key={item.id}
                    onClick={() => toggleItem(item)}
                    aria-pressed={isSelected}
                    aria-label={item.name}
                    className={`h-auto justify-start p-0 whitespace-normal w-full sm:w-auto shrink-0 snap-start rounded-xl overflow-hidden bg-card text-left transition-all relative flex sm:block ${
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
                    <div className="h-20 w-20 shrink-0 sm:h-auto sm:w-auto sm:aspect-square">
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="p-2 space-y-0.5">
                      <p className="text-xs font-body font-medium text-foreground truncate">
                        <IconText text={CATEGORIES[item.category] || '📦'} /> <IconText text={item.name} />
                      </p>
                      {subLabel && (
                        <p className="text-[11px] font-body text-muted-foreground truncate">{subLabel}</p>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
          {selectedItems.length > 0 && (
            <div className="rounded-xl bg-card shadow-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-display font-semibold text-foreground">Vista previa del outfit</p>
                <span className="text-[11px] font-body text-muted-foreground">Gratis · sin usar pruebas</span>
              </div>
              <div className="flex gap-3">
                {selfie && (
                  <div className="w-1/3 shrink-0 rounded-lg overflow-hidden bg-secondary cursor-zoom-in" onClick={() => setLightboxSrc(modelImage || selfie || '')}>
                    <img src={modelImage || selfie || ''} alt="Tu modelo" className="w-full h-full object-contain aspect-[3/4] bg-muted" />
                  </div>
                )}
                <div className={`grid gap-2 flex-1 ${selectedItems.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {selectedItems.map(item => (
                    <div key={item.id} className="rounded-lg overflow-hidden bg-secondary">
                      <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover" loading="lazy" />
                      <p className="text-[11px] font-body text-foreground truncate px-1.5 py-1"><IconText text={item.name} /></p>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] font-body text-muted-foreground">¿Te convence la combinación? Recién ahí generala con IA.</p>
            </div>
          )}
          {!quotaLoading && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5" aria-label="Pruebas de outfit disponibles">
              <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[11px] font-body text-muted-foreground">
                Outfits generables:{' '}
                <span className={`font-semibold ${quota.tryonsLeft > 0 ? 'text-foreground' : 'text-destructive'}`}>
                  {quota.tryonsLeft}
                </span>
                {` de ${isPremium ? LIMITS.premium.tryonsPerMonth : LIMITS.free.tryonsPerMonth} este mes`}
              </span>
              {isPremium && (
                <span className="text-[11px] font-body text-muted-foreground" aria-label="Outfits disponibles hoy">
                  Outfits generables hoy:{' '}
                  <span className={`font-semibold ${quota.tryonsDailyLeft && quota.tryonsLeft > 0 ? 'text-foreground' : 'text-destructive'}`}>
                    {Math.min(quota.tryonsDailyLeft ?? 0, quota.tryonsLeft)}
                  </span>
                  {` de ${LIMITS.premium.tryonsPerDay}`}
                </span>
              )}
              {quota.tryonCredits > 0 && <span className="text-[11px] font-body text-foreground">Outfits extra: {quota.tryonCredits}</span>}
              {(quota.tryonsLeft === 0 || quota.tryonsDailyLeft === 0) && (
                <Button variant="outline" size="sm" className="basis-full text-xs" onClick={() => navigatePremium('/premium#outfits-extra')}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Comprar outfits extra
                </Button>
              )}
            </div>
          )}
          {selectedItems.length > 0 && !usingSavedAvatar && (
            <p className="text-[11px] font-body text-center text-muted-foreground">
              {selfie ? 'Guardá el modelo primero' : 'Generá tu modelo, guardalo y después podés generar el outfit'}
            </p>
          )}
          <Button
            variant="warm"
            className={`w-full ${!usingSavedAvatar || selectedItems.length === 0 ? 'opacity-50' : ''}`}
            aria-disabled={!usingSavedAvatar || selectedItems.length === 0 || loading}
            disabled={loading}
            onClick={handleTryon}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando outfit virtual...</>
            ) : (
              <><Sparkles className="h-4 w-4 mr-2" /> Generar con IA ({selectedItems.length > 1 ? `${selectedItems.length} prendas` : '1 prenda'})</>
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

      <ItemLightbox src={lightboxSrc ?? ''} alt="Tu avatar en pantalla completa" open={!!lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* Info */}
      <div className="bg-card rounded-xl p-4 shadow-card text-center">
        <p className="text-sm text-muted-foreground font-body"><IconText text={"Seleccioná varias prendas para armar un outfit completo. La IA genera una imagen aproximada ✨"} /></p>
      </div>
    </div>
  );
}
