import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ItemLightboxProps {
  src: string;
  alt?: string;
  open: boolean;
  onClose: () => void;
}

/** Pantalla completa para ver la foto de una prenda; se cierra con la cruz, tocando afuera o Escape. */
export default function ItemLightbox({ src, alt, open, onClose }: ItemLightboxProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-foreground/95 flex items-center justify-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute top-3 right-3 h-10 w-10 rounded-full bg-background/80 text-foreground flex items-center justify-center z-10"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt ?? ''}
        className="max-h-[92vh] max-w-[94vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
