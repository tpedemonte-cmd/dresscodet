// Cuotas de uso de IA por plan (avatares y pruebas de outfit).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { freeAvatarAllowance } from './avatarRules.ts';

export const LIMITS = {
  free: {
    avatarFreeTotal: 1, // un solo avatar gratis en toda la cuenta
    savedModels: 1,
    tryonsPerMonth: 2,
    outfitsPerDay: 2,
  },
  premium: {
    avatarFreeTotal: 1,
    savedModels: 1,
    tryonsPerMonth: 15,
  },
} as const;

export type UsageKind = 'avatar' | 'tryon' | 'outfit';

export function userClient(authHeader: string) {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
}

export function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
  );
}

function startOfMonth() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function startOfDay() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString();
}

async function countUsage(sb: any, userId: string, kind: UsageKind, since?: string) {
  let q = sb
    .from('ai_usage_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('kind', kind);
  if (since) q = q.gte('created_at', since);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export interface QuotaDecision {
  ok: boolean;
  status?: number;
  error?: string;
  useCredit: boolean;
  userId: string;
  isPremium?: boolean;
}

/**
 * Verifica si el usuario puede consumir una generación.
 * Devuelve useCredit=true cuando hay que descontar un crédito comprado.
 */
export async function checkQuota(req: Request, kind: UsageKind): Promise<QuotaDecision> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) {
    return { ok: false, status: 401, error: 'Iniciá sesión para usar esta función.', useCredit: false, userId: '' };
  }

  const sb = userClient(authHeader);
  const { data: userData } = await sb.auth.getUser();
  const user = userData?.user;
  if (!user) {
    return { ok: false, status: 401, error: 'Iniciá sesión para usar esta función.', useCredit: false, userId: '' };
  }

  const { data: sub } = await sb
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  const expired = !!sub?.current_period_end && new Date(sub.current_period_end) < new Date();
  const isPremium = sub?.plan === 'premium' && sub?.status === 'active' && !expired;

  if (kind === 'outfit') {
    if (isPremium) return { ok: true, useCredit: false, userId: user.id };
    const used = await countUsage(sb, user.id, 'outfit', startOfDay());
    if (used >= LIMITS.free.outfitsPerDay) {
      return {
        ok: false,
        status: 403,
        error: `El plan gratis incluye ${LIMITS.free.outfitsPerDay} outfits del momento por día. Volvé mañana o pasate a Premium para pedir sin límite.`,
        useCredit: false,
        userId: user.id,
      };
    }
    return { ok: true, useCredit: false, userId: user.id };
  }

  if (kind === 'tryon') {
    const limit = isPremium ? LIMITS.premium.tryonsPerMonth : LIMITS.free.tryonsPerMonth;
    const used = await countUsage(sb, user.id, 'tryon', startOfMonth());
    if (used >= limit) {
      return {
        ok: false,
        status: 403,
        error: isPremium
          ? `Llegaste a las ${limit} pruebas de outfit de este mes. Se renuevan el mes que viene.`
          : `El plan gratis incluye ${limit} pruebas de outfit por mes. Pasate a Premium para tener ${LIMITS.premium.tryonsPerMonth}.`,
        useCredit: false,
        userId: user.id,
      };
    }
    return { ok: true, useCredit: false, userId: user.id };
  }

  const { count: savedModels, error: modelsError } = await sb.from('user_models')
    .select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if (modelsError) throw modelsError;
  if (freeAvatarAllowance(0, 0, savedModels ?? 0) === 0) {
    return { ok: false, status: 403, error: 'Eliminá tu modelo actual con un avatar extra disponible antes de generar otro.', useCredit: false, userId: user.id };
  }
  const total = await countUsage(sb, user.id, 'avatar');
  if (total < LIMITS.free.avatarFreeTotal) {
    return { ok: true, useCredit: false, userId: user.id, isPremium };
  }

  const { data: credits } = await sb
    .from('avatar_credits')
    .select('balance')
    .eq('user_id', user.id)
    .maybeSingle();

  if ((credits?.balance ?? 0) > 0) {
    return { ok: true, useCredit: true, userId: user.id, isPremium };
  }

  return {
    ok: false,
    status: 402,
    error: 'Ya usaste tu modelo gratis. Comprá un avatar extra (USD 0,99) o el pack de 3 (USD 1,99) para armar más.',
    useCredit: false,
    userId: user.id,
  };
}

/** Registra el consumo y descuenta el crédito comprado si corresponde. */
export async function recordUsage(decision: QuotaDecision, kind: UsageKind) {
  const admin = adminClient();
  if (kind === 'avatar') {
    const { error } = await admin.rpc('record_avatar_generation', {
      p_user_id: decision.userId,
      p_use_credit: decision.useCredit,
    });
    if (error) throw error;
    return;
  }
  const { error } = await admin.from('ai_usage_events').insert({
    user_id: decision.userId,
    kind,
    used_credit: decision.useCredit,
  });
  if (error) throw error;

  if (decision.useCredit) {
    const { data } = await admin
      .from('avatar_credits')
      .select('balance')
      .eq('user_id', decision.userId)
      .maybeSingle();
    const next = Math.max(0, (data?.balance ?? 0) - 1);
    await admin
      .from('avatar_credits')
      .upsert(
        { user_id: decision.userId, balance: next, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
  }
}
