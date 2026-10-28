// Cuotas de uso de IA por plan (avatares y pruebas de outfit).
import { adminClient, authenticatedClient } from './backend.ts';
import type { DataBackend } from './backendSelection.ts';
export { adminClient, userClient } from './backend.ts';
import { freeAvatarAllowance } from './avatarRules.ts';
import { calculateTryonQuota, TRYON_LIMITS, tryonMonthStart } from './tryonQuota.ts';
import { readTryonCredits, spendTryonCredit } from './tryonCredits.ts';

export const LIMITS = {
  free: {
    avatarFreeTotal: 1, // un solo avatar gratis en toda la cuenta
    savedModels: 1,
    ...TRYON_LIMITS.free,
    outfitsPerDay: 2,
  },
  premium: {
    avatarFreeTotal: 1,
    savedModels: 1,
    ...TRYON_LIMITS.premium,
    outfitsPerDay: 5,
  },
} as const;

export type UsageKind = 'avatar' | 'tryon' | 'outfit';

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
  backend?: DataBackend;
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
  const authenticated = await authenticatedClient(req);
  if (!authenticated) {
    return { ok: false, status: 401, error: 'Iniciá sesión para usar esta función.', useCredit: false, userId: '' };
  }
  const decision = await checkUserQuota(authenticated.client, authenticated.user.id, kind, authenticated.backend);
  return { ...decision, backend: authenticated.backend };
}

async function checkUserQuota(sb: any, userId: string, kind: UsageKind, backend?: DataBackend): Promise<QuotaDecision> {
  const user = { id: userId };

  const { data: sub, error: subError } = await sb
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();
  if (subError) throw subError;

  const expired = !!sub?.current_period_end && new Date(sub.current_period_end) < new Date();
  const isPremium = sub?.plan === 'premium' && sub?.status === 'active' && !expired;

  if (kind === 'outfit') {
    const limit = isPremium ? LIMITS.premium.outfitsPerDay : LIMITS.free.outfitsPerDay;
    const used = await countUsage(sb, user.id, 'outfit', startOfDay());
    if (used >= limit) {
      return {
        ok: false,
        status: 403,
        error: isPremium
          ? `Usaste las ${limit} sugerencias de hoy. Volvé mañana para pedir más.`
          : `El plan gratis incluye ${limit} outfits del momento por día. Volvé mañana o pasate a Premium para pedir más.`,
        useCredit: false,
        userId: user.id,
      };
    }
    return { ok: true, useCredit: false, userId: user.id };
  }

  if (kind === 'tryon') {
    const limit = isPremium ? LIMITS.premium.tryonsPerMonth : LIMITS.free.tryonsPerMonth;
    const { data: events, error } = await sb.from('ai_usage_events')
      .select('plan_tier, created_at').eq('user_id', user.id).eq('kind', 'tryon')
      .eq('plan_tier', isPremium ? 'premium' : 'free').gte('created_at', tryonMonthStart());
    if (error) throw error;
    const remaining = calculateTryonQuota(events ?? [], isPremium ? 'premium' : 'free');
    if (remaining.tryonsLeft === 0 || remaining.tryonsDailyLeft === 0) {
      if (await readTryonCredits(backend, user.id) > 0) {
        return { ok: true, useCredit: true, userId: user.id, isPremium };
      }
    }
    if (remaining.tryonsLeft === 0) {
      return {
        ok: false,
        status: 403,
        error: isPremium
          ? `Llegaste a las ${limit} pruebas de este mes. Comprá outfits extra para continuar.`
          : `Usaste las ${limit} pruebas de este mes. Comprá outfits extra para continuar.`,
        useCredit: false,
        userId: user.id,
      };
    }
    if (remaining.tryonsDailyLeft === 0) {
      return { ok: false, status: 403, error: 'Llegaste a los 5 outfits de hoy. Comprá outfits extra o volvé mañana.', useCredit: false, userId: user.id, isPremium };
    }
    return { ok: true, useCredit: false, userId: user.id, isPremium };
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
  const admin = adminClient(decision.backend);
  if (kind === 'avatar') {
    const { error } = await admin.rpc('record_avatar_generation', {
      p_user_id: decision.userId,
      p_use_credit: decision.useCredit,
    });
    if (error) throw error;
    return;
  }
  if (kind === 'tryon') {
    if (decision.useCredit) {
      await spendTryonCredit(decision.backend, decision.userId);
      return;
    }
    const { error } = await admin.rpc('record_tryon_generation', {
      p_user_id: decision.userId,
      p_plan_tier: decision.isPremium ? 'premium' : 'free',
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
