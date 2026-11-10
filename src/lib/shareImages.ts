import { Capacitor } from '@capacitor/core';

export type ShareableImage = { url: string; name: string };
export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/heic': 'heic',
};

/** Nombre de archivo único y seguro para cada imagen compartida. */
export function buildShareFileName(name: string, mime: string, used: Set<string>): string {
  const base =
    (name || 'prenda')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 _-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 60) || 'prenda';
  const ext = EXTENSIONS[mime?.toLowerCase()] ?? 'jpg';
  let candidate = `${base}.${ext}`;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${n}.${ext}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

async function loadFiles(images: ShareableImage[]): Promise<File[]> {
  const used = new Set<string>();
  const blobs = await Promise.all(
    images.map(async (img) => {
      const res = await fetch(img.url);
      if (!res.ok) throw new Error(`No se pudo descargar ${img.name}`);
      return res.blob();
    }),
  );
  return blobs.map((blob, i) => {
    const type = blob.type || 'image/jpeg';
    return new File([blob], buildShareFileName(images[i].name, type, used), { type });
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function isCancel(err: unknown) {
  const e = err as { name?: string; message?: string };
  return e?.name === 'AbortError' || /cancel/i.test(e?.message ?? '');
}

async function shareNative(files: File[], title: string, text: string): Promise<ShareResult> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const stamp = Date.now();
  const uris: string[] = [];
  for (const file of files) {
    const written = await Filesystem.writeFile({
      path: `compartir/${stamp}/${file.name}`,
      data: await blobToBase64(file),
      directory: Directory.Cache,
      recursive: true,
    });
    uris.push(written.uri);
  }
  try {
    await Share.share({ title, text, files: uris, dialogTitle: title });
    return 'shared';
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
    throw err;
  }
}

function downloadFiles(files: File[]) {
  files.forEach((file, i) => {
    setTimeout(() => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, i * 300);
  });
}

export type PreparedShare = {
  files: File[];
  /** Abre el menú de compartir (WhatsApp, Gmail, etc.) con cada imagen como archivo separado. */
  share: () => Promise<ShareResult>;
};

/** Descarga las imágenes y deja listo el envío. Separado para poder reintentar con un toque nuevo. */
export async function prepareImageShare(
  images: ShareableImage[],
  title = 'Mis prendas',
  text = 'Prendas de mi armario en DressCode',
): Promise<PreparedShare> {
  const files = await loadFiles(images);
  return {
    files,
    share: async () => {
      if (Capacitor.isNativePlatform()) return shareNative(files, title, text);
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files })) {
        try {
          await nav.share({ files, title, text });
          return 'shared';
        } catch (err) {
          if (isCancel(err)) return 'cancelled';
          throw err;
        }
      }
      downloadFiles(files);
      return 'downloaded';
    },
  };
}
