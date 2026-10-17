import { useEffect, useState } from 'react';

// Recorta el fondo vacío alrededor del modelo para que la imagen llene el marco
// sin cortar el cuerpo. Devuelve la imagen original si no puede recortar con confianza.

let imgCache = new Map<string, string>();

export function useTrimmedImage(src: string | null): { url: string | null; trimming: boolean } {
  const [url, setUrl] = useState<string | null>(src);
  const [trimming, setTrimming] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!src) {
      setUrl(null);
      setTrimming(false);
      return;
    }
    setUrl(src);
    setTrimming(true);
    trimImage(src).then((t) => {
      if (alive) {
        setUrl(t);
        setTrimming(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [src]);
  return { url, trimming };
}


function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function toSameOriginUrl(src: string): Promise<string> {
  // Último recurso si la carga con CORS falla: traer como blob (URL de mismo origen, no contamina el canvas)
  const res = await fetch(src);
  if (!res.ok) throw new Error('No se pudo descargar la imagen');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function trimImage(src: string): Promise<string> {
  if (!src || src.startsWith('data:image/png') && src.length < 2000) return src;
  const cached = imgCache.get(src);
  if (cached) return cached;

  let img: HTMLImageElement;
  try {
    img = await loadImage(src);
  } catch {
    try {
      img = await loadImage(await toSameOriginUrl(src));
    } catch {
      return src;
    }
  }

  try {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return src;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return src;
    ctx.drawImage(img, 0, 0);

    let pixels: Uint8ClampedArray;
    try {
      pixels = ctx.getImageData(0, 0, w, h).data;
    } catch {
      return src; // canvas contaminado: sin CORS no se puede medir
    }

    // Color de fondo: promedio de parches en las 4 esquinas
    const cornerAvg = (x0: number, y0: number) => {
      let r = 0, g = 0, b = 0, n = 0;
      const size = Math.max(4, Math.round(Math.min(w, h) * 0.03));
      for (let y = y0; y < Math.min(y0 + size, h); y++) {
        for (let x = x0; x < Math.min(x0 + size, w); x++) {
          const i = (y * w + x) * 4;
          r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++;
        }
      }
      return [r / n, g / n, b / n] as const;
    };
    const corners = [
      cornerAvg(0, 0), cornerAvg(w - 8, 0),
      cornerAvg(0, h - 8), cornerAvg(w - 8, h - 8),
    ];
    const bg = corners.reduce<[number, number, number]>(
      (acc, c) => [acc[0] + c[0] / 4, acc[1] + c[1] / 4, acc[2] + c[2] / 4],
      [0, 0, 0],
    );

    // Bounding box de píxeles que se diferencian del fondo
    const threshold = 40;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const dr = pixels[i] - bg[0];
        const dg = pixels[i + 1] - bg[1];
        const db = pixels[i + 2] - bg[2];
        if (Math.sqrt(dr * dr + dg * dg + db * db) > threshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < 0) return src;

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    // Si el sujeto ya ocupa casi todo, no hay nada que recortar
    if (bboxW > w * 0.97 && bboxH > h * 0.97) return src;

    // Respiración: 2,5% del lado más grande
    const pad = Math.round(Math.max(bboxW, bboxH) * 0.025);
    const cx0 = Math.max(0, minX - pad);
    const cy0 = Math.max(0, minY - pad);
    const cw = Math.min(w - cx0, bboxW + pad * 2);
    const ch = Math.min(h - cy0, bboxH + pad * 2);
    if (cw < 32 || ch < 32) return src;

    const out = document.createElement('canvas');
    out.width = cw;
    out.height = ch;
    out.getContext('2d')!.drawImage(img, cx0, cy0, cw, ch, 0, 0, cw, ch);
    const result = out.toDataURL('image/png');

    if (imgCache.size > 30) imgCache = new Map();
    imgCache.set(src, result);
    return result;
  } catch {
    return src;
  }
}
