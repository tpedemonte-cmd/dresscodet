import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Trash2 } from 'lucide-react';

interface DeleteHistoryConfirmDialogProps {
  entry: { id: string; event: string; created_at: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function DeleteHistoryConfirmDialog({
  entry,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteHistoryConfirmDialogProps) {
  if (!entry) return null;

  const date = new Date(entry.created_at).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            ¿Eliminar registro?
          </DialogTitle>
          <DialogDescription className="text-center text-base text-muted-foreground">
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Trash2 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-body font-medium text-foreground truncate capitalize">
              {entry.event}
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {date}
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground font-body text-center">
          Vas a eliminar este outfit del historial. La recomendación y toda la información asociada se perderá.
        </p>

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
