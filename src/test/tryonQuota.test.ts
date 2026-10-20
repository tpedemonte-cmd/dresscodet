import { describe, expect, it } from 'vitest';
import { calculateTryonQuota, type TryonUsage } from '../../supabase/functions/_shared/tryonQuota';

const now = new Date('2026-10-20T05:19:00Z');
const event = (plan_tier = 'premium', created_at = '2026-10-20T04:00:00Z'): TryonUsage => ({ plan_tier, created_at });

describe('independent Premium try-on quotas', () => {
  it('starts Premium at 15 monthly and 5 daily even after both free tries', () => {
    const usage = [event('free'), event('free')];
    expect(calculateTryonQuota(usage, 'free', now).tryonsLeft).toBe(0);
    expect(calculateTryonQuota(usage, 'premium', now)).toEqual({ tryonsThisMonth: 0, tryonsToday: 0, tryonsLeft: 15, tryonsDailyLeft: 5 });
  });
  it('decreases both counters after one Premium outfit', () => {
    expect(calculateTryonQuota([event('free'), event()], 'premium', now)).toEqual({ tryonsThisMonth: 1, tryonsToday: 1, tryonsLeft: 14, tryonsDailyLeft: 4 });
  });
  it('exhausts the daily limit after 5 without exhausting the month', () => {
    const quota = calculateTryonQuota(Array.from({ length: 5 }, () => event()), 'premium', now);
    expect(quota.tryonsDailyLeft).toBe(0);
    expect(quota.tryonsLeft).toBe(10);
  });
  it('exhausts the monthly limit after 15 across multiple days', () => {
    const usage = Array.from({ length: 15 }, (_, i) => event('premium', `2026-10-${10 + Math.floor(i / 5)}T04:00:00Z`));
    expect(calculateTryonQuota(usage, 'premium', now).tryonsLeft).toBe(0);
  });
  it('renews the daily counter without renewing the monthly counter', () => {
    const usage = Array.from({ length: 5 }, () => event('premium', '2026-10-19T23:59:59Z'));
    expect(calculateTryonQuota(usage, 'premium', now)).toEqual({ tryonsThisMonth: 5, tryonsToday: 0, tryonsLeft: 10, tryonsDailyLeft: 5 });
  });
  it('renews both counters at the new UTC month', () => {
    expect(calculateTryonQuota([event()], 'premium', new Date('2026-11-01T00:00:00Z')).tryonsLeft).toBe(15);
  });
  it('does not replenish Premium usage by switching plans back and forth', () => {
    const usage = [event(), event('free')];
    expect(calculateTryonQuota(usage, 'free', now).tryonsLeft).toBe(1);
    expect(calculateTryonQuota(usage, 'premium', now).tryonsLeft).toBe(14);
  });
});