import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, History, CalendarDays, Shirt } from 'lucide-react';

interface DeleteItemConfirmDialogProps {
  item: { id: string; name: string; image_url: string } | null;
  historyCount: number;
  planCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function DeleteItemConfirmDialog({
  item,
  historyCount,
  planCount,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteItemConfirmDialogProps) {
  if (!item) return null;

  const hasRefs = historyCount > 0 || planCount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            ¿Eliminar prenda?
          </DialogTitle>
          <DialogDescription className="text-center text-base text-muted-foreground">
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          <img
            src={item.image_url}
            alt={item.name}
            className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="font-body font-medium text-foreground truncate">{item.name}</p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Shirt className="h-3.5 w-3.5" /> Prenda del guardarropas
            </p>
          </div>
        </div>

        {hasRefs && (
          <div className="space-y-2 rounded-xl border border-border p-4 bg-background">
            <p className="font-body font-medium text-foreground text-sm">
              También se actualizará:
            </p>
            {historyCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <History className="h-4 w-4 text-primary flex-shrink-0" />
                <span>
                  Se quitará de <strong className="text-foreground">{historyCount}</strong>{' '}
                  {historyCount === 1 ? 'outfit en el historial' : 'outfits en el historial'}
                </span>
              </div>
            )}
            {planCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                <span>
                  Se quitará de <strong className="text-foreground">{planCount}</strong>{' '}
                  {planCount === 1 ? 'plan semanal' : 'planes semanales'}
                </span>
              </div>
            )}
          </div>
        )}

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
