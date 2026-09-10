import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { getSubcategories } from '@/lib/subcategories';

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
  { value: 'medias', label: '🧦 Medias' },
  { value: 'accesorio', label: '🎒 Accesorio' },
  { value: 'otro', label: '📦 Otro' },
];

interface EditItemDialogProps {
  item: { id: string; name: string; category: string; color: string | null; image_url: string; subcategory?: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditItemDialog({ item, open, onOpenChange }: EditItemDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [subcategory, setSubcategory] = useState(item.subcategory || '');
  const [color, setColor] = useState(item.color || '');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('clothing_items')
        .update({ name, category, subcategory: subcategory || null, color: color || null })
        .eq('id', item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
      toast.success('Prenda actualizada');
      onOpenChange(false);
    },
    onError: () => toast.error('Error al actualizar'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Editar prenda</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center">
          <img src={item.image_url} alt={item.name} className="w-32 h-32 object-cover rounded-lg" />
        </div>
        <div className="space-y-3">
          <Input placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Color (opcional)" value={color} onChange={(e) => setColor(e.target.value)} />
          <Button variant="warm" className="w-full" disabled={!name || !category || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
