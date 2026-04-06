import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { userPhotoBase64, clothingImageUrl, clothingName, clothingCategory } = await req.json();

    if (!userPhotoBase64 || !clothingImageUrl) {
      return new Response(
        JSON.stringify({ error: "Se requiere una foto tuya y una prenda seleccionada." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download clothing image and convert to base64
    const clothingResp = await fetch(clothingImageUrl);
    if (!clothingResp.ok) {
      throw new Error("No se pudo descargar la imagen de la prenda");
    }
    const clothingBuffer = await clothingResp.arrayBuffer();
    const clothingBase64 = btoa(
      new Uint8Array(clothingBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
    );
    const clothingMime = clothingResp.headers.get("content-type") || "image/jpeg";

    const prompt = `You are a virtual fashion try-on assistant. Take the person in the first image and realistically dress them in the clothing item shown in the second image (${clothingName || "clothing item"}, category: ${clothingCategory || "general"}). 
    
Rules:
- Keep the person's face, body shape, skin tone, and pose exactly as they are
- Replace or overlay the relevant clothing area with the garment from the second image
- Make it look natural and realistic, matching lighting and perspective
- Keep the background from the first image
- Output a full-body or upper-body photo of the person wearing the item`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: userPhotoBase64 },
              },
              {
                type: "image_url",
                image_url: { url: `data:${clothingMime};base64,${clothingBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Esperá un momento e intentá de nuevo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos agotados. Contactá al administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("Error al procesar la imagen");
    }

    const data = await response.json();
    const resultImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const resultText = data.choices?.[0]?.message?.content || "";

    if (!resultImage) {
      throw new Error("No se pudo generar la imagen. Probá con otra foto o prenda.");
    }

    return new Response(
      JSON.stringify({ image: resultImage, text: resultText }),
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
