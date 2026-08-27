import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const BATCH_SIZE = 40
const LOCK_NAME = 'refresh-plan-weather'
const LEASE_MINUTES = 5

type Mapped = { value: string; label: string }

function mapWeatherCode(code: number, isDay: boolean): Mapped {
  if ([0, 1].includes(code)) {
    return isDay
      ? { value: 'soleado', label: '☀️ Soleado' }
      : { value: 'despejado-noche', label: '🌙 Despejado' }
  }
  if ([2, 3, 45, 48].includes(code)) return { value: 'nublado', label: '☁️ Nublado' }
  if ([95, 96, 99].includes(code)) return { value: 'tormenta', label: '⛈️ Tormenta' }
  return { value: 'lluvia', label: '🌧️ Lluvia' }
}

function getSeason(latitude: number, date: Date): string {
  const month = date.getMonth() + 1
  const south = latitude < 0
  if (south) {
    if ([12, 1, 2].includes(month)) return 'verano'
    if ([3, 4, 5].includes(month)) return 'otoño'
    if ([6, 7, 8].includes(month)) return 'invierno'
    return 'primavera'
  }
  if ([12, 1, 2].includes(month)) return 'invierno'
  if ([3, 4, 5].includes(month)) return 'primavera'
  if ([6, 7, 8].includes(month)) return 'verano'
  return 'otoño'
}

async function fetchForecast(lat: number, lon: number, date: string, time?: string | null) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code,is_day,wind_speed_10m,precipitation_probability&daily=temperature_2m_max,weather_code,precipitation_probability_max,wind_speed_10m_max&start_date=${date}&end_date=${date}&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json()

  let temperature: number | null = null
  let code = 0
  let isDay = true
  let windKmh = 0
  let rain = 0

  const hourly = data?.hourly
  if (hourly && Array.isArray(hourly.time)) {
    const targetHour = time ? parseInt(String(time).split(':')[0], 10) : 12
    let i = hourly.time.findIndex(
      (t: string) => t.startsWith(date) && new Date(t).getHours() === targetHour
    )
    if (i < 0) i = hourly.time.findIndex((t: string) => t.startsWith(date))
    if (i >= 0) {
      temperature = Math.round(hourly.temperature_2m?.[i] ?? 20)
      code = hourly.weather_code?.[i] ?? 0
      isDay = (hourly.is_day?.[i] ?? 1) === 1
      windKmh = Math.round(hourly.wind_speed_10m?.[i] ?? 0)
      rain = Math.round(hourly.precipitation_probability?.[i] ?? 0)
    }
  }

  if (temperature == null) {
    const t = data?.daily?.temperature_2m_max?.[0]
    if (t == null) return null
    temperature = Math.round(t)
    code = data?.daily?.weather_code?.[0] ?? 0
    windKmh = Math.round(data?.daily?.wind_speed_10m_max?.[0] ?? 0)
    rain = Math.round(data?.daily?.precipitation_probability_max?.[0] ?? 0)
  }

  const mapped = mapWeatherCode(code, isDay)
  return {
    temperature,
    weather: mapped.value,
    weather_label: mapped.label,
    wind_kmh: windKmh,
    rain_probability: rain,
    is_night: mapped.value === 'despejado-noche',
    season: getSeason(lat, new Date(`${date}T12:00:00`)),
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    // Single-flight lock (lease based)
    const now = new Date()
    const leaseUntil = new Date(now.getTime() + LEASE_MINUTES * 60_000).toISOString()

    const { data: lock } = await supabase
      .from('job_locks')
      .select('name, locked_until')
      .eq('name', LOCK_NAME)
      .maybeSingle()

    if (lock && lock.locked_until && new Date(lock.locked_until) > now) {
      return new Response(JSON.stringify({ skipped: 'locked' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: lockError } = await supabase
      .from('job_locks')
      .upsert({ name: LOCK_NAME, locked_until: leaseUntil }, { onConflict: 'name' })
    if (lockError) throw lockError

    const today = now.toISOString().slice(0, 10)
    const staleCutoff = new Date(now.getTime() - 12 * 3600_000).toISOString()

    const { data: plans, error } = await supabase
      .from('weekly_plans')
      .select('id, plan_date, plan_time, latitude, longitude, temperature, weather_synced_at')
      .gte('plan_date', today)
      .or(`temperature.is.null,weather_synced_at.is.null,weather_synced_at.lt.${staleCutoff}`)
      .order('plan_date', { ascending: true })
      .limit(BATCH_SIZE)

    if (error) throw error

    let updated = 0
    let pending = 0

    for (const p of plans ?? []) {
      const forecast = await fetchForecast(
        Number(p.latitude),
        Number(p.longitude),
        p.plan_date,
        p.plan_time
      )
      if (!forecast) {
        // Pronóstico todavía no disponible: se reintenta en la próxima corrida
        pending++
        continue
      }
      const { error: upErr } = await supabase
        .from('weekly_plans')
        .update({ ...forecast, weather_synced_at: new Date().toISOString() })
        .eq('id', p.id)
      if (!upErr) updated++
    }

    // Release lock
    await supabase
      .from('job_locks')
      .upsert({ name: LOCK_NAME, locked_until: new Date().toISOString() }, { onConflict: 'name' })

    return new Response(
      JSON.stringify({ checked: plans?.length ?? 0, updated, pending }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    console.error('refresh-plan-weather error', e)
    await supabase
      .from('job_locks')
      .upsert({ name: LOCK_NAME, locked_until: new Date().toISOString() }, { onConflict: 'name' })
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
