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

// Recibe coordenadas ya obtenidas y busca clima + ciudad.
// Útil cuando llamamos a navigator.geolocation directamente desde un click handler
// para preservar el "user gesture" en navegadores móviles.
export async function fetchWeatherFromCoords(latitude: number, longitude: number): Promise<WeatherInfo> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day,wind_speed_10m,precipitation_probability&hourly=precipitation_probability&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pudimos obtener el clima');
  const data = await res.json();

  const temperature = Math.round(data?.current?.temperature_2m ?? 20);
  const code = data?.current?.weather_code ?? 0;
  const isDay = (data?.current?.is_day ?? 1) === 1;
  const windKmh = Math.round(data?.current?.wind_speed_10m ?? 0);

  let precipitationProbability = data?.current?.precipitation_probability;
  if (precipitationProbability == null && Array.isArray(data?.hourly?.precipitation_probability)) {
    const next6 = data.hourly.precipitation_probability.slice(0, 6).filter((v: any) => typeof v === 'number');
    precipitationProbability = next6.length ? Math.max(...next6) : 0;
  }
  precipitationProbability = Math.round(precipitationProbability ?? 0);

  const mapped = mapWeatherCode(code, isDay);

  let city: string | undefined;
  try {
    const geoRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=es&count=1`
    );
    if (geoRes.ok) {
      const geo = await geoRes.json();
      const r = geo?.results?.[0];
      if (r?.name) city = r.name;
    }
  } catch {
    // ignorar
  }

  if (!city) {
    try {
      const osmRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=es&zoom=12`,
        { headers: { 'Accept': 'application/json' } }
      );
      if (osmRes.ok) {
        const osm = await osmRes.json();
        const a = osm?.address || {};
        city =
          a.city ||
          a.town ||
          a.village ||
          a.suburb ||
          a.city_district ||
          a.municipality ||
          a.county ||
          a.state_district ||
          a.state;
      }
    } catch {
      // ignorar
    }
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

export async function fetchCurrentWeather(): Promise<WeatherInfo> {
  const pos = await getCurrentPosition();
  return fetchWeatherFromCoords(pos.coords.latitude, pos.coords.longitude);
}

export type GeoResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number };

export async function searchCity(query: string): Promise<GeoResult[]> {
  if (!query.trim()) return [];
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=10&language=es&format=json&countryCode=AR`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.results || [])
    .filter((r: any) => r.country_code === 'AR' || r.country === 'Argentina')
    .map((r: any) => ({
      name: r.name,
      admin1: r.admin1,
      country: r.country,
      latitude: r.latitude,
      longitude: r.longitude,
    }));
}

// Devuelve el clima previsto para una fecha específica (YYYY-MM-DD) en una ubicación.
// Toma el promedio del día y, si hay hora, prioriza la hora indicada.
export async function fetchForecastForDate(
  latitude: number,
  longitude: number,
  date: string,
  timeHHmm?: string
): Promise<WeatherInfo & { date: string }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weather_code,is_day,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_speed_10m_max&start_date=${date}&end_date=${date}&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('No pudimos obtener el pronóstico para esa fecha');
  const data = await res.json();

  let temperature: number;
  let code: number;
  let isDay = true;
  let windKmh = 0;
  let precipitationProbability = 0;

  const hourly = data?.hourly;
  if (hourly && Array.isArray(hourly.time)) {
    const targetHour = timeHHmm ? parseInt(timeHHmm.split(':')[0], 10) : 12;
    const idx = hourly.time.findIndex((t: string) => t.startsWith(date) && new Date(t).getHours() === targetHour);
    const i = idx >= 0 ? idx : hourly.time.findIndex((t: string) => t.startsWith(date));
    if (i >= 0) {
      temperature = Math.round(hourly.temperature_2m[i] ?? 20);
      code = hourly.weather_code[i] ?? 0;
      isDay = (hourly.is_day[i] ?? 1) === 1;
      windKmh = Math.round(hourly.wind_speed_10m[i] ?? 0);
      precipitationProbability = Math.round(hourly.precipitation_probability[i] ?? 0);
    } else {
      temperature = Math.round(data?.daily?.temperature_2m_max?.[0] ?? 20);
      code = data?.daily?.weather_code?.[0] ?? 0;
      windKmh = Math.round(data?.daily?.wind_speed_10m_max?.[0] ?? 0);
      precipitationProbability = Math.round(data?.daily?.precipitation_probability_max?.[0] ?? 0);
    }
  } else {
    temperature = Math.round(data?.daily?.temperature_2m_max?.[0] ?? 20);
    code = data?.daily?.weather_code?.[0] ?? 0;
    windKmh = Math.round(data?.daily?.wind_speed_10m_max?.[0] ?? 0);
    precipitationProbability = Math.round(data?.daily?.precipitation_probability_max?.[0] ?? 0);
  }

  const mapped = mapWeatherCode(code, isDay);

  return {
    temperature,
    weather: mapped.value,
    weatherLabel: mapped.label,
    season: getSeason(latitude, new Date(date)),
    windKmh,
    precipitationProbability,
    isDay,
    date,
  };
}
