import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Trash2, ImageIcon, Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useState } from 'react';

export default function Looks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: looks = [], isLoading } = useQuery({
    queryKey: ['saved_looks', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_looks')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_looks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_looks'] });
      toast.success('Look eliminado');
    },
    onError: () => toast.error('Error al eliminar el look'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <ImageIcon className="h-6 w-6 text-primary" />
          Mis Looks
        </h2>
        <p className="text-muted-foreground font-body">Tus outfits generados con el probador virtual</p>
      </div>

      {looks.length === 0 ? (
        <div className="bg-card rounded-xl p-8 shadow-card text-center space-y-4">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground font-body">Todavía no guardaste ningún look</p>
          <Link to="/probador">
            <Button variant="warm">Ir al probador virtual</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {looks.map((look) => (
            <div key={look.id} className="bg-card rounded-xl overflow-hidden shadow-card group relative">
              <div className="aspect-[3/4]">
                <img src={look.image_url} alt="Look guardado" className="w-full h-full object-cover" loading="lazy" />
              </div>
              <div className="p-3 space-y-1">
                {look.note && (
                  <p className="text-xs font-body text-foreground line-clamp-2">{look.note}</p>
                )}
                <p className="text-[10px] text-muted-foreground font-body">
                  {new Date(look.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => deleteMutation.mutate(look.id)}
                className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
