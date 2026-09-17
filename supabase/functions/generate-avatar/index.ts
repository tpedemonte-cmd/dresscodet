import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiGenerateImage } from "../_shared/ai.ts";
import { checkQuota, recordUsage } from "../_shared/quotas.ts";

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
    const {
      height, weight, age, gender,
      hairColor, hairStyle, skinTone, bodyType,
      measurements,
    } = await req.json();

    const quota = await checkQuota(req, "avatar");
    if (!quota.ok) {
      return new Response(
        JSON.stringify({ error: quota.error, quota_exceeded: true }),
        { status: quota.status ?? 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    const traits: string[] = [];
    if (hairColor) traits.push(`hair color: ${hairColor}`);
    if (hairStyle) traits.push(`hair style: ${hairStyle}`);
    if (skinTone) traits.push(`skin tone: ${skinTone}`);
    if (bodyType) traits.push(`body type: ${bodyType}`);
    const traitsText = traits.length
      ? `\nPersonal features (in Spanish terms, follow them closely): ${traits.join(", ")}.`
      : "";

    const MEASURE_LABELS: Record<string, string> = {
      chest: "chest/bust circumference",
      waist: "waist circumference",
      hips: "hip circumference",
      shoulders: "shoulder width",
      inseam: "inseam (leg length)",
      armLength: "arm length",
      neck: "neck circumference",
      thigh: "thigh circumference",
      shoeSize: "shoe size (AR)",
    };
    const measureList = Object.entries(measurements ?? {})
      .filter(([k, v]) => MEASURE_LABELS[k] && v !== "" && v != null && !isNaN(Number(v)))
      .map(([k, v]) => `${MEASURE_LABELS[k]}: ${Number(v)}${k === "shoeSize" ? "" : "cm"}`);
    const measureText = measureList.length
      ? `\nBody measurements to respect accurately in the silhouette proportions: ${measureList.join(", ")}.`
      : "";

    const prompt = `Generate a realistic full-body photograph of a ${genderText} of ${age} years old, ${height}cm tall, weighing ${weight}kg, with a ${bodyType || build} body build.${traitsText}${measureText}

The person should:
- Stand in a neutral relaxed pose, facing the camera, arms slightly away from the body
- Wear plain neutral underwear (basic gray/white tank top and shorts) so clothing can be virtually tried on later
- Have a neutral facial expression${traits.length ? "" : " and a generic appearance (no distinctive features)"}
- Be photographed against a clean light gray seamless studio background
- Be evenly lit with soft natural lighting
- Be shown from head to toe, fully visible, centered in the frame
- Photorealistic quality, like a fashion catalog base model`;

    const result = await aiGenerateImage(prompt);

    if (!result.ok) {
      if (result.status === 429) {
        return new Response(
          JSON.stringify({ error: "Se agotó la cuota de generación de imágenes por ahora. Si usás la clave gratuita de Google AI Studio, esperá unos minutos (o hasta mañana) y volvé a intentar." }),
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
        JSON.stringify({ error: "No se pudo generar el avatar" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await recordUsage(quota, "avatar");

    return new Response(
      JSON.stringify({ image: result.dataUrl, used_credit: quota.useCredit }),
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
