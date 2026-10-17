// Shared AI configuration.
// Uses Lovable AI when available; otherwise falls back to a direct Gemini API key
// (GEMINI_API_KEY) through Google's OpenAI-compatible endpoint, so the same code
// works on a self-hosted Supabase project.

const GEMINI_MODEL_MAP: Record<string, string> = {
  // Image generation: Nano Banana 2 Lite (gemini-3.1-flash-lite-image) —
  // cheapest of the family with better quality than Nano Banana 1.
  'gemini-3.1-flash-image-preview': 'gemini-3.1-flash-lite-image',
  'gemini-3-pro-image-preview': 'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image': 'gemini-3.1-flash-lite-image',
  'gemini-3-pro-image': 'gemini-3.1-flash-lite-image',
  'gemini-3-flash-preview': 'gemini-2.5-flash',
  'gemini-3.8-flash': 'gemini-2.5-flash',
};

const IMAGE_MODEL = 'google/gemini-3.1-flash-lite-image'; // Nano Banana 2 Lite

function toGeminiModel(model: string): string {
  const bare = model.replace(/^google\//, '');
  return GEMINI_MODEL_MAP[bare] ?? bare;
}

export interface AiConfig {
  url: string;
  key: string;
  model: string;
  provider: 'lovable' | 'gemini';
}

export function getAiConfig(model: string): AiConfig {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    return {
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      key: lovableKey,
      model,
      provider: 'lovable',
    };
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (geminiKey) {
    return {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: geminiKey,
      model: toGeminiModel(model),
      provider: 'gemini',
    };
  }

  throw new Error('No hay clave de IA configurada (LOVABLE_API_KEY o GEMINI_API_KEY)');
}

export interface AiImageResult {
  ok: boolean;
  status: number;
  dataUrl?: string;
  text?: string;
}

/**
 * Generates (or edits, when input images are provided) an image with
 * Nano Banana 2 Lite on both providers:
 * - Lovable AI Gateway: POST /v1/images/generations
 * - Direct Gemini key: chat/completions with modalities ["image","text"]
 */
async function toInlineData(src: string): Promise<{ mimeType: string; data: string }> {
  const m = src.match(/^data:([^;]+);base64,(.*)$/s);
  if (m) return { mimeType: m[1], data: m[2] };
  if (!/^https?:\/\//i.test(src)) return { mimeType: 'image/png', data: src };
  const res = await fetch(src);
  if (!res.ok) throw new Error(`No se pudo descargar la imagen (${res.status})`);
  const mimeType = (res.headers.get('content-type') || 'image/png').split(';')[0];
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return { mimeType, data: btoa(bin) };
}

export async function aiGenerateImage(
  prompt: string,
  inputImages: string[] = [],
): Promise<AiImageResult> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    // Con fotos de referencia, este modelo necesita el formato generate-content con inlineData
    // (un campo `image` suelto se ignora y la IA inventa otra persona).
    let body: Record<string, unknown>;
    if (inputImages.length > 0) {
      const encoded = await Promise.all(inputImages.map(toInlineData));
      body = {
        model: IMAGE_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              ...encoded.map(({ mimeType, data }) => ({ inlineData: { mimeType, data } })),
            ],
          },
        ],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      };
    } else {
      body = { model: IMAGE_MODEL, prompt };
    }
    const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('AI gateway image error:', res.status, errText);
      return { ok: false, status: res.status };
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return { ok: false, status: 500 };
    return { ok: true, status: 200, dataUrl: `data:image/jpeg;base64,${b64}` };
  }

  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (geminiKey) {
    const contentParts: any[] = [{ type: 'text', text: prompt }];
    for (const img of inputImages) {
      contentParts.push({ type: 'image_url', image_url: { url: img } });
    }

    // Preferred model first; the rest are fallbacks that usually still have
    // quota on the AI Studio free tier (429 / 404 on the newest models).
    const candidates = [
      toGeminiModel(IMAGE_MODEL),
      'gemini-2.5-flash-image',
      'gemini-2.5-flash-image-preview',
      'gemini-2.0-flash-preview-image-generation',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastStatus = 500;
    let lastError = '';

    for (const model of candidates) {
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${geminiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: contentParts }],
            modalities: ['image', 'text'],
          }),
        },
      );

      if (!res.ok) {
        lastStatus = res.status;
        lastError = await res.text();
        console.error('Gemini image error:', model, res.status, lastError);
        // Quota / model-not-available: try the next candidate.
        if (res.status === 429 || res.status === 404 || res.status === 400) continue;
        return { ok: false, status: res.status, text: lastError };
      }

      const data = await res.json();
      const msg = data?.choices?.[0]?.message;
      const url = msg?.images?.[0]?.image_url?.url;
      if (!url) {
        lastStatus = 500;
        lastError = 'La respuesta del modelo no incluyó una imagen';
        console.error('Gemini image: no image in response for', model);
        continue;
      }
      return { ok: true, status: 200, dataUrl: url, text: msg?.content || '' };
    }

    return { ok: false, status: lastStatus, text: lastError };
  }

  throw new Error('No hay clave de IA configurada (LOVABLE_API_KEY o GEMINI_API_KEY)');
}
