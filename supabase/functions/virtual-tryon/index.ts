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

    const prompt = clothingImages.length === 1
      ? `You are a virtual fashion try-on assistant. Take the person in the first image and realistically dress them in the clothing item shown in the second image (${clothingImages[0].name}, category: ${clothingImages[0].category}).

Rules:
- Keep the person's face, body shape, skin tone, and pose exactly as they are
- Replace or overlay the relevant clothing area with the garment from the second image
- Make it look natural and realistic, matching lighting and perspective
- Keep the background from the first image
- Output a full-body or upper-body photo of the person wearing the item`
      : `You are a virtual fashion try-on assistant. Take the person in the first image and realistically dress them in ALL the clothing items shown in the following images to create a complete outfit.

Items to apply:
${itemsList}

Rules:
- Keep the person's face, body shape, skin tone, and pose exactly as they are
- Apply EACH clothing item to the correct body area based on its category
- Layer items naturally (e.g., jacket over shirt)
- Make it look natural and realistic, matching lighting and perspective
- Keep the background from the first image
- Output a full-body or upper-body photo of the person wearing the complete outfit`;

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
      if (result.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contactá al administrador." }),
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
