/**
 * Phone photos store their real pixels sideways plus an EXIF orientation flag.
 * Browsers apply that flag when displaying, but the AI model ignores it and
 * returns the person lying sideways, so the photo must be re-encoded upright
 * (and smaller) before it is sent to the generator.
 */

const MAX_SIDE = 1280;

function readRaw(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer la foto'));
    reader.readAsDataURL(file);
  });
}

export async function fileToUprightPhoto(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return readRaw(file);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return readRaw(file);
  }
}
