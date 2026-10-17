import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiGenerateImage } from "../_shared/ai.ts";
import { checkQuota, recordUsage } from "../_shared/quotas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

  try {
    const quota = await checkQuota(req, "tryon");
    if (!quota.ok) {
      return new Response(
        JSON.stringify({ error: quota.error, quota_exceeded: true }),
        { status: quota.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
- The output MUST show the exact same person from IMAGE 1: same face, hair, gender, age, body shape, skin tone, height proportions and pose.
- Keep the exact background, lighting and camera framing of IMAGE 1 (full body, head to feet visible).
- Garment reference photos may contain other people, mannequins or backgrounds: IGNORE them completely. Copy ONLY the garment (color, fabric, cut, details) and never copy any person or scene from them.
- Apply each garment to the correct body area by its category, replacing what the target person wears there; layer naturally (e.g. jacket over shirt).
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
      JSON.stringify({ image: result.dataUrl, text: result.text || "" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("virtual-tryon error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
