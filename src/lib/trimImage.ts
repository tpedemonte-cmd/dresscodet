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

    // Detección por bordes: el fondo de estudio es liso (aunque tenga degradé), la persona tiene contornos.
    const edge = Math.max(4, Math.round(w * 0.02));
    const minRun = 3;
    const luma = new Float32Array(w * h);
    for (let p = 0; p < w * h; p++) {
      luma[p] = pixels[p * 4] * 0.299 + pixels[p * 4 + 1] * 0.587 + pixels[p * 4 + 2] * 0.114;
    }
    const mask = new Uint8Array(w * h);
    const colCnt = new Uint32Array(w);
    for (let y = 0; y < h - 2; y++) {
      let count = 0;
      for (let x = edge; x < w - edge; x++) {
        const p = y * w + x;
        const g = Math.abs(luma[p] - luma[p + 2]) + Math.abs(luma[p] - luma[p + 2 * w]);
        if (g > 18) {
          mask[p] = 1;
          count++;
        }
      }
      // Filas con bordes en casi todo el ancho son la línea del piso, no la persona
      if (count >= (w - edge * 2) * 0.4) {
        for (let x = 0; x < w; x++) mask[y * w + x] = 0;
      } else {
        for (let x = edge; x < w - edge; x++) colCnt[x] += mask[y * w + x];
      }
    }
    const colMin = Math.max(4, Math.round(h * 0.03));
    let minX = w, maxX = -1;
    for (let x = 0; x < w; x++) {
      if (colCnt[x] >= colMin) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
    if (maxX < 0) return src;
    let minY = h, maxY = -1;
    for (let y = 0; y < h; y++) {
      let c = 0;
      for (let x = minX; x <= maxX; x++) c += mask[y * w + x];
      if (c >= minRun) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxY < 0) return src;

    const bboxW = maxX - minX + 1;
    const bboxH = maxY - minY + 1;
    if (bboxW < 16 || bboxH < 32) return src;

    // Encuadre retrato 3:4 centrado en la persona, con la cabeza y los pies completos
    let targetH = bboxH * 1.08;
    let targetW = targetH * 0.75;
    if (targetW < bboxW * 1.06) {
      targetW = bboxW * 1.06;
      targetH = targetW / 0.75;
    }
    // Si el encuadre no entra en la foto, achicarlo (sin cortar a la persona) para no rellenar
    const fit = Math.min(1, h / targetH, w / targetW);
    const minFit = Math.max(bboxH / targetH, bboxW / targetW);
    if (fit < 1) {
      const f = Math.max(fit, minFit);
      targetH *= f;
      targetW *= f;
    }
    const cx = minX + bboxW / 2;
    const cy = minY + bboxH / 2;
    const clampPos = (start: number, size: number, total: number) =>
      size <= total ? Math.min(Math.max(0, start), total - size) : (total - size) / 2;
    const sx = clampPos(cx - targetW / 2, targetW, w);
    const sy = clampPos(cy - targetH / 2, targetH, h);

    const scale = Math.min(1, 900 / targetW);
    const outW = Math.round(targetW * scale);
    const outH = Math.round(targetH * scale);
    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const octx = out.getContext('2d')!;
    // Relleno con el color del fondo por si el encuadre sale de la foto
    const p0 = (Math.min(h - 1, Math.max(0, Math.round(cy))) * w) * 4;
    octx.fillStyle = `rgb(${pixels[p0]},${pixels[p0 + 1]},${pixels[p0 + 2]})`;
    octx.fillRect(0, 0, outW, outH);
    // Intersección del encuadre con la imagen
    const ix0 = Math.max(0, sx), iy0 = Math.max(0, sy);
    const ix1 = Math.min(w, sx + targetW), iy1 = Math.min(h, sy + targetH);
    const dx = (ix0 - sx) * scale, dy = (iy0 - sy) * scale;
    const dw = (ix1 - ix0) * scale, dh = (iy1 - iy0) * scale;
    // Extender el fondo estirando los bordes de la foto (pared arriba, piso abajo) para que no se note
    if (dy > 0) octx.drawImage(img, ix0, iy0, ix1 - ix0, 1, dx, 0, dw, dy + 1);
    if (dy + dh < outH) octx.drawImage(img, ix0, iy1 - 1, ix1 - ix0, 1, dx, dy + dh - 1, dw, outH - dy - dh + 1);
    if (dx > 0) octx.drawImage(img, ix0, iy0, 1, iy1 - iy0, 0, dy, dx + 1, dh);
    if (dx + dw < outW) octx.drawImage(img, ix1 - 1, iy0, 1, iy1 - iy0, dx + dw - 1, dy, outW - dx - dw + 1, dh);
    octx.drawImage(img, ix0, iy0, ix1 - ix0, iy1 - iy0, dx, dy, dw, dh);
    const result = out.toDataURL('image/jpeg', 0.92);

    if (imgCache.size > 30) imgCache = new Map();
    imgCache.set(src, result);
    return result;
  } catch {
    return src;
  }
}
