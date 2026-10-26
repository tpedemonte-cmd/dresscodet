// Guarda la foto propia del usuario como modelo fijo y descuenta una generación
// de avatar del mismo contador que usa generate-avatar (sin llamar a la IA).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { adminClient, checkQuota, recordUsage } from "../_shared/quotas.ts";
import { authenticatedClient } from '../_shared/backend.ts';
import type { DataBackend } from '../_shared/backendSelection.ts';
import { corsHeaders as sdkCorsHeaders } from 'npm:@supabase/supabase-js@2/cors';
const corsHeaders = { ...sdkCorsHeaders, 'Access-Control-Allow-Headers': `${sdkCorsHeaders['Access-Control-Allow-Headers']}, x-data-backend` };
import { z } from 'npm:zod@3';
import { AVATAR_MIN_HEIGHT_CM, AVATAR_MIN_WEIGHT_KG } from '../_shared/avatarRules.ts';

const PhotoModelBody = z.object({
  imageBase64: z.string().min(100).max(15_000_000),
  height: z.coerce.number().finite().min(AVATAR_MIN_HEIGHT_CM).max(300),
  weight: z.coerce.number().finite().min(AVATAR_MIN_WEIGHT_KG).max(600),
  age: z.coerce.number().int().min(1).max(120),
  gender: z.enum(['masculino', 'femenino', 'otro']),
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let lockUserId: string | null = null;
  let lockBackend: DataBackend = 'cloud';
  const lockToken = crypto.randomUUID();
  try {
    const authenticated = await authenticatedClient(req);
    if (!authenticated) {
      return jsonResponse({ error: 'Iniciá sesión para usar esta función.' }, 401);
    }
    lockBackend = authenticated.backend;
    const admin = adminClient(lockBackend);

    const { data: acquired, error: lockError } = await admin.rpc('acquire_avatar_generation_lock', { p_user_id: authenticated.user.id, p_token: lockToken });
    if (lockError) throw lockError;
    if (!acquired) {
      return jsonResponse({ error: 'Ya hay un modelo generándose. Esperá a que termine.' }, 409);
    }
    lockUserId = authenticated.user.id;

    const parsed = PhotoModelBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return jsonResponse({ error: 'Revisá los datos del modelo.', details: parsed.error.flatten().fieldErrors }, 400);
    }
    const { imageBase64, height, weight, age, gender } = parsed.data;

    // Misma regla que el avatar con IA: consume una generación (gratis inicial o crédito comprado).
    const quota = await checkQuota(req, "avatar");
    if (!quota.ok) {
      return jsonResponse({ error: quota.error, quota_exceeded: true });
    }

    const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
    const contentType = match?.[1] ?? 'image/jpeg';
    const base64Data = match ? match[2] : imageBase64;
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const bytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `${authenticated.user.id}/model-${Date.now()}.${ext}`;
    const { error: uploadError } = await admin.storage
      .from('look-images')
      .upload(fileName, bytes, { contentType });
    if (uploadError) throw uploadError;

    const { data: urlData } = admin.storage.from('look-images').getPublicUrl(fileName);

    const { data: model, error: insertError } = await admin
      .from('user_models')
      .insert({
        user_id: authenticated.user.id,
        image_url: urlData.publicUrl,
        height,
        weight,
        age,
        gender,
        is_active: true,
      })
      .select()
      .single();
    if (insertError) {
      await admin.storage.from('look-images').remove([fileName]);
      throw insertError;
    }

    await admin
      .from('user_models')
      .update({ is_active: false })
      .neq('id', model.id)
      .eq('user_id', authenticated.user.id);

    // Si el registro del consumo falla, deshacemos el modelo para no cobrar de más ni de menos.
    try {
      await recordUsage(quota, 'avatar');
    } catch (recordError) {
      await admin.from('user_models').delete().eq('id', model.id);
      await admin.storage.from('look-images').remove([fileName]);
      throw recordError;
    }

    return jsonResponse({ model });
  } catch (err) {
    console.error('save-photo-model error:', err);
    return jsonResponse({ error: 'No se pudo guardar tu modelo. Probá de nuevo.' }, 500);
  } finally {
    if (lockUserId) {
      await adminClient(lockBackend).rpc('release_avatar_generation_lock', { p_user_id: lockUserId, p_token: lockToken }).catch(() => {});
    }
  }
});
