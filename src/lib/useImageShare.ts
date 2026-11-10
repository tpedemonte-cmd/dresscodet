import { useState } from 'react';
import { toast } from 'sonner';
import { prepareImageShare, type ShareableImage, type ShareResult } from '@/lib/shareImages';

/** Comparte imágenes como archivos separados, con avisos y estado de carga por botón. */
export function useImageShare() {
  const [sharingKey, setSharingKey] = useState<string | null>(null);

  const shareImages = async (
    images: ShareableImage[],
    key: string,
    opts: { title?: string; text?: string; onShared?: () => void } = {},
  ) => {
    if (images.length === 0 || sharingKey) return;
    setSharingKey(key);
    try {
      const prepared = await prepareImageShare(images, opts.title, opts.text);
      const finish = (result: ShareResult) => {
        if (result === 'downloaded') {
          toast.success(
            prepared.files.length === 1
              ? 'Se descargó la imagen. Adjuntala a tu mail o mensaje.'
              : `Se descargaron ${prepared.files.length} imágenes separadas. Adjuntalas a tu mail o mensaje.`,
          );
        }
        if (result !== 'cancelled') opts.onShared?.();
      };
      try {
        finish(await prepared.share());
      } catch (err) {
        if ((err as { name?: string })?.name !== 'NotAllowedError') throw err;
        toast('Las imágenes están listas', {
          action: {
            label: 'Compartir',
            onClick: () => {
              prepared.share().then(finish).catch(() => toast.error('No se pudo compartir'));
            },
          },
          duration: 15000,
        });
      }
    } catch {
      toast.error('No se pudieron compartir las imágenes');
    } finally {
      setSharingKey(null);
    }
  };

  return { shareImages, sharingKey };
}
