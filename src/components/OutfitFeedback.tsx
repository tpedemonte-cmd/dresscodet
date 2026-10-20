import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, X, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import {
  FEEDBACK_LEARNING_MESSAGE,
  feedbackOutfitKey,
  isLearningPromptTap,
  registerFeedbackTap,
} from '@/lib/feedbackPrompt';

type FeedbackValue = 'liked' | 'disliked' | 'used' | 'not_used' | null;

interface Props {
  table: 'outfit_history' | 'weekly_plans';
  recordId: string;
  initialFeedback?: FeedbackValue;
  initialFavorite?: boolean;
  onChange?: () => void;
}

const OPTIONS: { value: Exclude<FeedbackValue, null>; label: string; Icon: any; activeClass: string }[] = [
  { value: 'liked', label: 'Me gustó', Icon: ThumbsUp, activeClass: 'bg-emerald-500/15 border-emerald-500 text-emerald-600' },
  { value: 'disliked', label: 'No me gustó', Icon: ThumbsDown, activeClass: 'bg-destructive/15 border-destructive text-destructive' },
  { value: 'used', label: 'Lo usé', Icon: Check, activeClass: 'bg-primary/15 border-primary text-primary' },
  { value: 'not_used', label: 'No lo usaría', Icon: X, activeClass: 'bg-muted border-muted-foreground text-muted-foreground' },
];

export default function OutfitFeedback({ table, recordId, initialFeedback = null, initialFavorite = false, onChange }: Props) {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<FeedbackValue>(initialFeedback);
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);

  const update = async (patch: Record<string, any>) => {
    setBusy(true);
    const { error } = await supabase.from(table as any).update(patch).eq('id', recordId);
    setBusy(false);
    if (error) {
      toast.error('No se pudo guardar');
      return false;
    }
    onChange?.();
    return true;
  };

  const canFavorite = feedback === 'liked' || feedback === 'used';

  const handleFeedback = async (val: Exclude<FeedbackValue, null>) => {
    const next = feedback === val ? null : val;
    const prev = feedback;
    const prevFav = favorite;
    const allows = next === 'liked' || next === 'used';
    setFeedback(next);
    const patch: Record<string, any> = { feedback: next };
    if (!allows && favorite) {
      patch.is_favorite = false;
      setFavorite(false);
    }
    const ok = await update(patch);
    if (!ok) {
      setFeedback(prev);
      setFavorite(prevFav);
    } else if (next) {
      const { count, isNewOutfit } = registerFeedbackTap(user?.id, feedbackOutfitKey(table, recordId));
      toast.success(
        isNewOutfit && isLearningPromptTap(count)
          ? FEEDBACK_LEARNING_MESSAGE
          : '¡Gracias por tu feedback!',
      );
      if (!allows && prevFav) toast.info('Se quitó de favoritos');
    }
  };

  const handleFavorite = async () => {
    if (!canFavorite) {
      toast.info('Marcá "Me gustó" o "Lo usé" para guardarlo como favorito');
      return;
    }
    const next = !favorite;
    setFavorite(next);
    const ok = await update({ is_favorite: next });
    if (!ok) setFavorite(!next);
    else toast.success(next ? 'Guardado en favoritos ⭐' : 'Quitado de favoritos');
  };


  return (
    <div className="pt-3 border-t border-border space-y-2">
      <p className="text-xs font-body font-medium text-muted-foreground">¿Qué te pareció?</p>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map(({ value, label, Icon, activeClass }) => {
          const active = feedback === value;
          return (
            <button
              key={value}
              type="button"
              disabled={busy}
              onClick={() => handleFeedback(value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-body font-medium transition-colors disabled:opacity-50',
                active ? activeClass : 'bg-background border-border text-foreground hover:bg-secondary',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
        <button
          type="button"
          disabled={busy || !canFavorite}
          title={!canFavorite ? 'Marcá "Me gustó" o "Lo usé" para guardarlo como favorito' : undefined}
          onClick={handleFavorite}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-body font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
            favorite
              ? 'bg-amber-400/20 border-amber-500 text-amber-600'
              : 'bg-background border-border text-foreground hover:bg-secondary',
          )}
        >
          <Star className={cn('h-3.5 w-3.5', favorite && 'fill-current')} />
          {favorite ? 'Favorito' : 'Guardar como favorito'}
        </button>
      </div>
    </div>
  );
}
