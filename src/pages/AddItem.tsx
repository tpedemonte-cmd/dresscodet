import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, Upload } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = [
  { value: 'remera', label: '👕 Remera' },
  { value: 'pantalon', label: '👖 Pantalón' },
  { value: 'campera', label: '🧥 Campera' },
  { value: 'buzo', label: '🧶 Buzo' },
  { value: 'camisa', label: '👔 Camisa' },
  { value: 'short', label: '🩳 Short' },
  { value: 'vestido', label: '👗 Vestido' },
  { value: 'pollera', label: '💃 Pollera' },
  { value: 'zapatillas', label: '👟 Zapatillas' },
  { value: 'zapatos', label: '👞 Zapatos' },
  { value: 'accesorio', label: '🎒 Accesorio' },
  { value: 'otro', label: '📦 Otro' },
];

export default function AddItem() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [color, setColor] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !file) throw new Error('Faltan datos');
      
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('clothing-photos')
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('clothing-photos')
        .getPublicUrl(filePath);

      const { error } = await supabase.from('clothing_items').insert({
        user_id: user.id,
        name,
        category,
        color: color || null,
        image_url: publicUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      toast.success('¡Prenda agregada!');
      navigate('/');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Error al guardar');
    },
  });

  const canSubmit = name && category && file;

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">Agregar Prenda</h2>
        <p className="text-muted-foreground font-body">Sacale una foto a tu ropa</p>
      </div>

      {/* Photo area */}
      <div className="space-y-3">
        {preview ? (
          <div className="relative aspect-square rounded-xl overflow-hidden shadow-card">
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => { setPreview(null); setFile(null); }}
              className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-body font-medium text-foreground"
            >
              Cambiar
            </button>
          </div>
        ) : (
          <div className="aspect-square bg-secondary rounded-xl flex flex-col items-center justify-center gap-4 border-2 border-dashed border-border">
            <p className="text-muted-foreground font-body text-sm">Elegí una foto</p>
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
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      </div>

      {/* Form */}
      <div className="space-y-4">
        <Input
          placeholder="Nombre de la prenda"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="Color (opcional)"
          value={color}
          onChange={(e) => setColor(e.target.value)}
        />

        <Button
          variant="warm"
          className="w-full"
          disabled={!canSubmit || mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar Prenda'}
        </Button>
      </div>
    </div>
  );
}
