export const TRYON_LIMITS = {
  free: { tryonsPerMonth: 2 },
  premium: { tryonsPerMonth: 15, tryonsPerDay: 5 },
} as const;

export type TryonPlan = 'free' | 'premium';
export interface TryonUsage { plan_tier: string; created_at: string; used_credit?: boolean }

export function tryonMonthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

/** Only successful generations charged to the current plan consume its UTC windows. */
export function calculateTryonQuota(events: TryonUsage[], plan: TryonPlan, now = new Date()) {
  const monthStart = Date.parse(tryonMonthStart(now));
  const dayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const charged = events.filter(event => !event.used_credit && event.plan_tier === plan && Date.parse(event.created_at) >= monthStart && Date.parse(event.created_at) <= now.getTime());
  const tryonsThisMonth = charged.length;
  const tryonsToday = charged.filter(event => Date.parse(event.created_at) >= dayStart).length;
  const tryonsLeft = Math.max(0, TRYON_LIMITS[plan].tryonsPerMonth - tryonsThisMonth);
  const tryonsDailyLeft = plan === 'premium' ? Math.max(0, TRYON_LIMITS.premium.tryonsPerDay - tryonsToday) : null;
  return { tryonsThisMonth, tryonsToday, tryonsLeft, tryonsDailyLeft };
}