// Obtiene clima actual usando Open-Meteo (sin API key)
// https://open-meteo.com/

export type WeatherInfo = {
  temperature: number;
  weather: 'soleado' | 'nublado' | 'lluvia' | 'tormenta';
  season: 'verano' | 'otoño' | 'invierno' | 'primavera';
  city?: string;
};

// WMO Weather interpretation codes -> nuestras categorías
function mapWeatherCode(code: number): WeatherInfo['weather'] {
  if ([0, 1].includes(code)) return 'soleado';
  if ([2, 3, 45, 48].includes(code)) return 'nublado';
  if ([95, 96, 99].includes(code)) return 'tormenta';
  // 51-67 llovizna/lluvia, 71-86 nieve (la tratamos como lluvia para el outfit)
  return 'lluvia';
}

// Estación según hemisferio y mes
function getSeason(latitude: number, date = new Date()): WeatherInfo['season'] {
  const month = date.getMonth() + 1; // 1-12
  const south = latitude < 0;
  // Hemisferio sur (Argentina): invierno jun-ago, primavera sep-nov, verano dic-feb, otoño mar-may
  if (south) {
    if ([12, 1, 2].includes(month)) return 'verano';
    if ([3, 4, 5].includes(month)) return 'otoño';
    if ([6, 7, 8].includes(month)) return 'invierno';
    return 'primavera';
  }
  if ([12, 1, 2].includes(month)) return 'invierno';
  if ([3, 4, 5].includes(month)) return 'primavera';
  if ([6, 7, 8].includes(month)) return 'verano';
  return 'otoño';
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('La geolocalización no está disponible en este dispositivo'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

export async function fetchCurrentWeather(): Promise<WeatherInfo> {
  const pos = await getCurrentPosition();
  const { latitude, longitude } = pos.coords;

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pudimos obtener el clima');
  const data = await res.json();

  const temperature = Math.round(data?.current?.temperature_2m ?? 20);
  const code = data?.current?.weather_code ?? 0;

  // Reverse geocoding opcional para mostrar ciudad
  let city: string | undefined;
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=es&count=1`
    );
    if (geoRes.ok) {
      const geo = await geoRes.json();
      city = geo?.results?.[0]?.name;
    }
  } catch {
    // ignorar, no es crítico
  }

  return {
    temperature,
    weather: mapWeatherCode(code),
    season: getSeason(latitude),
    city,
  };
}
