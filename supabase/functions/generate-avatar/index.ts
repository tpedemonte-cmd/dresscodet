import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiGenerateImage } from "../_shared/ai.ts";
import { adminClient, userClient, checkQuota, recordUsage } from "../_shared/quotas.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';
import { generateAvatarOptions, AVATAR_MIN_HEIGHT_CM, AVATAR_MIN_WEIGHT_KG } from '../_shared/avatarRules.ts';

const AvatarBody = z.object({
  height: z.coerce.number().finite().min(AVATAR_MIN_HEIGHT_CM, `La altura mínima es ${AVATAR_MIN_HEIGHT_CM} cm`).max(300),
  weight: z.coerce.number().finite().min(AVATAR_MIN_WEIGHT_KG, `El peso mínimo es ${AVATAR_MIN_WEIGHT_KG} kg`).max(600),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(['masculino', 'femenino', 'otro']),
  hairColor: z.string().max(80).optional(),
  hairStyle: z.string().max(80).optional(),
  skinTone: z.string().max(80).optional(),
  bodyType: z.string().max(80).optional(),
  measurements: z.record(z.union([z.string().max(20), z.number().finite().nonnegative().max(500)])).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let lockUserId: string | null = null;
  const lockToken = crypto.randomUUID();
  try {
    const { data: authData } = await userClient(req.headers.get('Authorization') ?? '').auth.getUser();
    if (!authData.user) {
      return new Response(JSON.stringify({ error: 'Iniciá sesión para usar esta función.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: acquired, error: lockError } = await adminClient().rpc('acquire_avatar_generation_lock', { p_user_id: authData.user.id, p_token: lockToken });
    if (lockError) throw lockError;
    if (!acquired) {
      return new Response(JSON.stringify({ error: 'Ya hay un modelo generándose. Esperá a que termine.' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    lockUserId = authData.user.id;
    const parsed = AvatarBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: 'Revisá los datos del modelo.', details: parsed.error.flatten().fieldErrors }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const {
      height, weight, age, gender,
      hairColor, hairStyle, skinTone, bodyType,
      measurements,
    } = parsed.data;

    const quota = await checkQuota(req, "avatar");
    if (!quota.ok) {
      return new Response(
        JSON.stringify({ error: quota.error, quota_exceeded: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    const images = await generateAvatarOptions(!!quota.isPremium, async (index) => {
      const result = await aiGenerateImage(`${prompt}\nCandidate ${index + 1}: create a distinct person matching all specified traits. Produce exactly one full-body person, never a collage.`);
      if (!result.ok) {
        const message = result.status === 429
          ? 'La IA está recibiendo demasiados pedidos. Esperá unos segundos y volvé a intentar.'
          : result.status === 402 || result.status === 403
            ? 'La IA no está disponible en este momento. Probá de nuevo más tarde.'
            : 'No se pudo generar el avatar';
        throw new Error(message);
      }
      return result.dataUrl;
    }, () => recordUsage(quota, 'avatar'));

    return new Response(
      JSON.stringify({ image: images[0], images, used_credit: quota.useCredit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-avatar error:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } finally {
    if (lockUserId) {
      const { error } = await adminClient().rpc('release_avatar_generation_lock', { p_user_id: lockUserId, p_token: lockToken });
      if (error) console.error('Avatar lock release failed');
    }
  }
});
