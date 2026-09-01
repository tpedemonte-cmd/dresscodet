import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Heart, ExternalLink } from 'lucide-react';

interface DeleteWishlistConfirmDialogProps {
  item: { id: string; title: string; thumbnail: string; image: string | null; permalink: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function DeleteWishlistConfirmDialog({
  item,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DeleteWishlistConfirmDialogProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center font-display text-xl">
            ¿Eliminar de favoritos?
          </DialogTitle>
          <DialogDescription className="text-center text-base text-muted-foreground">
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
          {item.thumbnail ? (
            <img
              src={item.image || item.thumbnail}
              alt={item.title}
              className="w-14 h-14 object-contain rounded-lg flex-shrink-0 bg-background"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Heart className="h-5 w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-body font-medium text-foreground line-clamp-2">{item.title}</p>
            <a
              href={item.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Ver en Mercado Libre
            </a>
          </div>
        </div>

        <p className="text-sm text-muted-foreground font-body text-center">
          Vas a quitar este producto de tu wishlist. Podés volver a agregarlo más tarde si querés.
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
