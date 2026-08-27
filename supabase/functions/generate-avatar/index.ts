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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { height, weight, age, gender, chest, waist, hips, muscle, skinTone, hairColor, hairLength } = await req.json();

    if (!height || !weight || !age || !gender) {
      return new Response(
        JSON.stringify({ error: "Faltan datos: altura, peso, edad y género son requeridos." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const heightM = Number(height) / 100;
    const bmi = Number(weight) / (heightM * heightM);
    let build = "promedio";
    if (bmi < 18.5) build = "delgada";
    else if (bmi < 25) build = "atlética y proporcionada";
    else if (bmi < 30) build = "robusta";
    else build = "corpulenta";

    const genderText = gender === "masculino" ? "hombre" : gender === "femenino" ? "mujer" : "persona";

    const m = Number(muscle);
    const muscleText = isNaN(m)
      ? ""
      : m < 25 ? "slim, low muscle definition"
      : m < 55 ? "normal muscle tone"
      : m < 80 ? "visibly toned and fit" : "very muscular, athletic build";

    const hl = Number(hairLength);
    const hairText = isNaN(hl)
      ? ""
      : hl < 15 ? "very short hair"
      : hl < 40 ? "short hair"
      : hl < 70 ? "medium-length hair" : "long hair";

    const measuresText = [
      chest ? `chest circumference ${chest}cm` : null,
      waist ? `waist circumference ${waist}cm` : null,
      hips ? `hip circumference ${hips}cm` : null,
    ].filter(Boolean).join(", ");

    const prompt = `Generate a realistic full-body photograph of a ${genderText} of ${age} years old, ${height}cm tall, weighing ${weight}kg, with a ${build} body build.

Body and appearance details (match them closely):
${muscleText ? `- Muscle/contexture: ${muscleText}\n` : ""}${measuresText ? `- Body measurements: ${measuresText}\n` : ""}${skinTone ? `- Skin tone approximately this color: ${skinTone}\n` : ""}${hairColor ? `- Hair color approximately this color: ${hairColor}\n` : ""}${hairText ? `- Hair length: ${hairText}\n` : ""}
The person should:
- Stand in a neutral relaxed pose, facing the camera, arms slightly away from the body
- Wear plain neutral underwear (basic gray/white tank top and shorts) so clothing can be virtually tried on later
- Have a neutral facial expression and a generic appearance (no distinctive features)
- Be photographed against a clean light gray seamless studio background
- Be evenly lit with soft natural lighting
- Be shown from head to toe, fully visible, centered in the frame
- Photorealistic quality, like a fashion catalog base model`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Demasiadas solicitudes. Esperá un momento." }),
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
      throw new Error("Error al generar avatar");
    }

    const data = await response.json();
    const image = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!image) throw new Error("No se pudo generar el avatar");

    return new Response(
      JSON.stringify({ image }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-avatar error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
