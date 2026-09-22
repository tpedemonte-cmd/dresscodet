// Obtiene la ubicación del dispositivo.
// - En la app nativa (APK): usa el plugin @capacitor/geolocation, que pide
//   el permiso al sistema Android/iOS en tiempo de ejecución.
// - En la web (Vercel/navegador): usa navigator.geolocation.
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type Coords = { latitude: number; longitude: number };

// Error compatible con el GeolocationPositionError del navegador
// (code 1 = permiso denegado), así el resto del código no cambia.
function geoError(code: number, message: string) {
  return { code, message, PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 };
}

export async function getDeviceCoords(): Promise<Coords> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Pide el permiso al sistema si todavía no lo tenemos
      const perm = await Geolocation.checkPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted' && req.coarseLocation !== 'granted') {
          throw geoError(1, 'Permiso de ubicación denegado.');
        }
      }
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch (err: any) {
      if (typeof err?.code === 'number') throw err;
      const msg = String(err?.message || '');
      if (/denied|permission/i.test(msg)) throw geoError(1, 'Permiso de ubicación denegado.');
      throw geoError(2, msg || 'No pudimos obtener tu ubicación');
    }
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(geoError(2, 'La geolocalización no está disponible en este dispositivo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  });
}
