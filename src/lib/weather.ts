// Obtiene clima actual usando Open-Meteo (sin API key)
// https://open-meteo.com/

export type WeatherCondition = 'soleado' | 'despejado-noche' | 'nublado' | 'lluvia' | 'tormenta';

export type WeatherInfo = {
  temperature: number;
  weather: WeatherCondition;
  weatherLabel: string; // etiqueta amigable con emoji
  season: 'verano' | 'otoño' | 'invierno' | 'primavera';
  city?: string;
  windKmh: number;
  precipitationProbability: number; // 0-100
  isDay: boolean;
};

// WMO Weather interpretation codes -> nuestras categorías
function mapWeatherCode(code: number, isDay: boolean): { value: WeatherCondition; label: string } {
  if ([0, 1].includes(code)) {
    return isDay
      ? { value: 'soleado', label: '☀️ Soleado' }
      : { value: 'despejado-noche', label: '🌙 Despejado' };
  }
  if ([2, 3, 45, 48].includes(code)) return { value: 'nublado', label: '☁️ Nublado' };
  if ([95, 96, 99].includes(code)) return { value: 'tormenta', label: '⛈️ Tormenta' };
  return { value: 'lluvia', label: '🌧️ Lluvia' };
}

// Estación según hemisferio y mes
function getSeason(latitude: number, date = new Date()): WeatherInfo['season'] {
  const month = date.getMonth() + 1;
  const south = latitude < 0;
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

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m,precipitation_probability&hourly=precipitation_probability&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pudimos obtener el clima');
  const data = await res.json();

  const temperature = Math.round(data?.current?.temperature_2m ?? 20);
  const code = data?.current?.weather_code ?? 0;
  const isDay = (data?.current?.is_day ?? 1) === 1;
  const windKmh = Math.round(data?.current?.wind_speed_10m ?? 0);

  // Probabilidad de precipitación: usa la actual o el máximo de las próximas horas
  let precipitationProbability = data?.current?.precipitation_probability;
  if (precipitationProbability == null && Array.isArray(data?.hourly?.precipitation_probability)) {
    const next6 = data.hourly.precipitation_probability.slice(0, 6).filter((v: any) => typeof v === 'number');
    precipitationProbability = next6.length ? Math.max(...next6) : 0;
  }
  precipitationProbability = Math.round(precipitationProbability ?? 0);

  const mapped = mapWeatherCode(code, isDay);

  // Reverse geocoding opcional
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
    // ignorar
  }

  return {
    temperature,
    weather: mapped.value,
    weatherLabel: mapped.label,
    season: getSeason(latitude),
    city,
    windKmh,
    precipitationProbability,
    isDay,
  };
}
