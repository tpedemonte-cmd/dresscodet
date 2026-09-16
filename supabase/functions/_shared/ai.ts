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

// Models the Lovable AI Gateway serves for image generation (same Nano Banana 2 Lite tier).
function toLovableModel(model: string): string {
  const bare = model.replace(/^google\//, '');
  if (GEMINI_MODEL_MAP[bare] === 'gemini-3.1-flash-lite-image') {
    return 'google/gemini-3.1-flash-lite-image';
  }
  return model;
}

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
