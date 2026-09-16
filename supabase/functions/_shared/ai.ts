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
export async function aiGenerateImage(
  prompt: string,
  inputImages: string[] = [],
): Promise<AiImageResult> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        ...(inputImages.length > 0
          ? { image: inputImages.length === 1 ? inputImages[0] : inputImages }
          : {}),
      }),
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

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${geminiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: toGeminiModel(IMAGE_MODEL),
          messages: [{ role: 'user', content: contentParts }],
          modalities: ['image', 'text'],
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini image error:', res.status, errText);
      return { ok: false, status: res.status };
    }

    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const url = msg?.images?.[0]?.image_url?.url;
    if (!url) return { ok: false, status: 500 };
    return { ok: true, status: 200, dataUrl: url, text: msg?.content || '' };
  }

  throw new Error('No hay clave de IA configurada (LOVABLE_API_KEY o GEMINI_API_KEY)');
}
