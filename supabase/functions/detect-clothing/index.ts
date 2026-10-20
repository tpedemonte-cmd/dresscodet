import { authenticatedClient } from "../_shared/backend.ts";
import { getAiConfig } from '../_shared/ai.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_CATEGORIES = [
  'remera', 'pantalon', 'campera', 'buzo', 'camisa',
  'short', 'vestido', 'pollera', 'zapatillas', 'zapatos',
  'medias', 'accesorio', 'otro',
];

const SUBCATEGORIES: Record<string, string[]> = {
  remera: ['manga_corta', 'manga_larga', 'musculosa', 'oversize', 'deportiva'],
  pantalon: ['jean', 'jogging', 'chino', 'cargo', 'vestir', 'calza'],
  campera: ['inflable', 'jean', 'cuero', 'rompeviento', 'sobretodo', 'liviana'],
  buzo: ['lana', 'frisa', 'canguro', 'medio_cierre'],
  camisa: ['manga_corta', 'manga_larga', 'lino', 'jean', 'franela'],
  short: ['jean', 'deportivo', 'bermuda', 'baño'],
  vestido: ['corto', 'midi', 'largo', 'fiesta'],
  pollera: ['corta', 'midi', 'larga', 'jean'],
  zapatillas: ['urbanas', 'deportivas', 'botitas', 'lona'],
  zapatos: ['vestir', 'mocasines', 'botas', 'sandalias', 'chatitas'],
  medias: ['cortas', 'largas', 'deportivas', 'termicas'],
  accesorio: ['gorra', 'bufanda', 'cinturon', 'bolso', 'lentes', 'joya'],
  otro: [],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!await authenticatedClient(req)) return new Response(JSON.stringify({ error: 'Iniciá sesión para usar esta función.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const ai = getAiConfig('google/gemini-2.5-flash');

    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Se requiere una imagen' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(ai.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ai.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this clothing item photo. Return ONLY a JSON object with three fields:
- "category": one of these exact values: ${VALID_CATEGORIES.join(', ')}
- "subcategory": the specific type of the garment. It MUST be one of the allowed values for the chosen category, using these exact strings:
${Object.entries(SUBCATEGORIES).map(([c, subs]) => `  ${c}: ${subs.length ? subs.join(', ') : '(none)'}`).join('\n')}
  If you cannot tell the subtype confidently, use null.
- "color": the main color in Spanish (e.g. "negro", "blanco", "azul", "rojo", "verde", "gris", "beige", "marrón", "rosa", "celeste", "naranja", "amarillo", "violeta", "bordo")

If you see multiple colors, pick the dominant one. If unsure about category, use "otro".
Use "medias" for socks of any kind (ankle socks, crew socks, sport socks, stockings, thigh-highs).
Pay attention to sleeve length (manga_corta vs manga_larga), fabric (jean, lana, frisa, cuero, lino) and shape to decide the subcategory.
Respond with ONLY the JSON, no extra text.`,
              },
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI error:', response.status, errText);
      throw new Error('Error al analizar la imagen');
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error('No se pudo interpretar la respuesta');

    const parsed = JSON.parse(jsonMatch[0]);
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : 'otro';
    const color = typeof parsed.color === 'string' ? parsed.color.toLowerCase().trim() : '';
    const rawSub = typeof parsed.subcategory === 'string' ? parsed.subcategory.toLowerCase().trim() : '';
    const subcategory = (SUBCATEGORIES[category] ?? []).includes(rawSub) ? rawSub : null;

    return new Response(
      JSON.stringify({ category, color, subcategory }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('detect-clothing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
