import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiGenerateImage } from "../_shared/ai.ts";
import { checkQuota, recordUsage } from "../_shared/quotas.ts";
import { clothingReplacementPlan } from '../_shared/clothingRules.ts';
import { adminClient, authenticatedClient } from '../_shared/backend.ts';
import type { DataBackend } from '../_shared/backendSelection.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-data-backend, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mime: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("No se pudo descargar la imagen de la prenda");
  const buffer = await resp.arrayBuffer();
  const base64 = toBase64(buffer);
  const mime = resp.headers.get("content-type") || "image/jpeg";
  return { base64, mime };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let locked: { backend: DataBackend; userId: string; token: string } | undefined;
  try {
    const authenticated = await authenticatedClient(req);
    if (!authenticated) return new Response(JSON.stringify({ error: 'Iniciá sesión para generar.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const token = crypto.randomUUID();
    const { data: acquired, error: lockError } = await adminClient(authenticated.backend).rpc('acquire_avatar_generation_lock', { p_user_id: authenticated.user.id, p_token: token });
    if (lockError) throw lockError;
    if (!acquired) return new Response(JSON.stringify({ error: 'Ya hay una generación en curso. Esperá a que termine.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    locked = { backend: authenticated.backend, userId: authenticated.user.id, token };
    const quota = await checkQuota(req, "tryon");
    if (!quota.ok) {
      return new Response(
        JSON.stringify({ error: quota.error, quota_exceeded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { userPhotoBase64 } = body;

    // Support both single item (legacy) and multiple items
    let clothingItems: { imageUrl: string; name: string; category: string }[] = [];
    if (body.clothingItems && Array.isArray(body.clothingItems)) {
      clothingItems = body.clothingItems;
    } else if (body.clothingImageUrl) {
      clothingItems = [{
        imageUrl: body.clothingImageUrl,
        name: body.clothingName || "clothing item",
        category: body.clothingCategory || "general",
      }];
    }

    if (!userPhotoBase64 || clothingItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "Se requiere una foto tuya y al menos una prenda seleccionada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download all clothing images in parallel
    const clothingImages = await Promise.all(
      clothingItems.map(async (item) => {
        const { base64, mime } = await fetchImageAsBase64(item.imageUrl);
        return { ...item, base64, mime };
      })
    );

    const itemsList = clothingImages
      .map((item, i) => `${i + 1}. ${item.name} (${item.category})`)
      .join("\n");

    const prompt = `Virtual try-on. IMAGE 1 is the TARGET PERSON (the user's model). The remaining ${clothingImages.length} image(s) are GARMENT REFERENCES ONLY.

Garments to put on the target person:
${itemsList}

STRICT RULES:
- The output MUST show the exact same person from IMAGE 1: same face, hair, gender, age, body shape, skin tone and height proportions.
- The person stands upright and straight, facing the camera. Never lying down, never rotated, never sideways.
- Vertical portrait composition (3:4): the whole body from head to feet visible, centered, with some empty space above the head.
- Replace the background with a clean, evenly lit, plain light gray seamless studio backdrop. Remove furniture, beds, rugs and any room details from IMAGE 1.
- Garment reference photos may contain other people, mannequins or backgrounds: IGNORE them completely. Copy ONLY the garment (color, fabric, cut, details) and never copy any person or scene from them.
- Apply each garment to the correct body area by its category, replacing what the target person wears there; layer naturally (e.g. jacket over shirt).
- Mandatory replacement plan (each category refers to the selected garment reference, never clothing already worn in IMAGE 1): ${JSON.stringify(clothingReplacementPlan(clothingItems.map(item => item.category)))}.
- REMOVE the original garment in every selected category BEFORE dressing the person in its replacement. A selected T-shirt replaces the original T-shirt or base tank top; trousers/shorts replace the original bottoms; socks replace original socks; shoes replace original footwear. Apply this replacement to ALL selected categories, including accessories. Never keep two garments of the same category, never overlay a new shirt on the old shirt, and never blend old garment colors, prints or details into the selected garment.
- Layer ONLY different categories naturally, such as a jacket over the selected shirt. Preserve clothing in unselected categories. Bare feet remain bare unless selected socks or footwear cover them; never invent unselected socks or shoes.
- Photorealistic result. Output a single image.`;

    const result = await aiGenerateImage(prompt, [
      userPhotoBase64,
      ...clothingImages.map(img => `data:${img.mime};base64,${img.base64}`),
    ]);

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Esperá un momento e intentá de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (result.status === 402 || result.status === 403) {
        return new Response(
          JSON.stringify({ error: "Se agotaron los créditos de IA de este entorno. Recargá el límite del workspace (o usá tu propia clave de Gemini) y volvé a intentar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "No se pudo generar la imagen. Probá con otra foto o prendas." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordUsage(quota, "tryon");

    return new Response(
      JSON.stringify({ image: result.dataUrl, text: result.text || "", used_credit: quota.useCredit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("virtual-tryon error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    if (locked) {
      const { error } = await adminClient(locked.backend).rpc('release_avatar_generation_lock', { p_user_id: locked.userId, p_token: locked.token });
      if (error) console.error('No se pudo liberar la generación');
    }
  }
});
