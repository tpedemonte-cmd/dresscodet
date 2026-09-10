import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { getSubcategories } from '@/lib/subcategories';

type Item = { id: string; category: string; image_url: string; subcategory?: string | null };

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export default function ClassifySubcategoriesButton({ items }: { items: Item[] }) {
  const queryClient = useQueryClient();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  // Solo prendas sin subtipo y cuya categoría tiene subtipos definidos
  const pending = items.filter((i) => !i.subcategory && getSubcategories(i.category).length > 0);

  if (pending.length === 0) return null;

  const run = async () => {
    setRunning(true);
    setProgress({ done: 0, total: pending.length });
    let ok = 0;
    for (let idx = 0; idx < pending.length; idx++) {
      const item = pending[idx];
      try {
        const base64 = await urlToBase64(item.image_url);
        const { data, error } = await supabase.functions.invoke('detect-clothing', {
          body: { imageBase64: base64 },
        });
        if (error) throw error;
        const allowed = getSubcategories(item.category).map((o) => o.value);
        const sub = data?.subcategory && allowed.includes(data.subcategory) ? data.subcategory : null;
        if (sub) {
          const { error: upErr } = await supabase
            .from('clothing_items')
            .update({ subcategory: sub } as any)
            .eq('id', item.id);
          if (upErr) throw upErr;
          ok++;
        }
      } catch (err) {
        console.error('classify failed for', item.id, err);
      }
      setProgress({ done: idx + 1, total: pending.length });
    }
    queryClient.invalidateQueries({ queryKey: ['clothing_items'] });
    setRunning(false);
    toast.success(
      ok > 0
        ? `${ok} prenda${ok === 1 ? '' : 's'} clasificada${ok === 1 ? '' : 's'} automáticamente`
        : 'No se pudo detectar el subtipo. Podés elegirlo a mano editando la prenda.'
    );
  };

  return (
    <div className="flex items-center gap-3 flex-wrap rounded-xl border border-border bg-card p-3">
      <p className="text-sm text-muted-foreground font-body flex-1 min-w-[200px]">
        Tenés {pending.length} prenda{pending.length === 1 ? '' : 's'} sin subtipo (manga larga, jean, etc.).
      </p>
      <button
        onClick={run}
        disabled={running}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-body font-medium bg-primary text-primary-foreground disabled:opacity-60"
      >
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Clasificando {progress.done}/{progress.total}
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Clasificar automáticamente
          </>
        )}
      </button>
    </div>
  );
}
