import { describe, expect, it } from 'vitest';
import { TRYON_PACKS, availableTryonCredits, canGenerateTryon, tryonLedgerId } from '../../supabase/functions/_shared/tryonPacks';
import { calculateTryonQuota } from '../../supabase/functions/_shared/tryonQuota';

describe('purchased outfits', () => {
  it('offers exactly one outfit for 0.99 USD', () => {
    expect(TRYON_PACKS.find(pack => pack.key === 'tryon_1')).toMatchObject({ credits: 1, price: 0.99 });
  });
  it('offers 5 outfits for 1.49 USD', () => {
    expect(TRYON_PACKS.find(pack => pack.key === 'tryon_5')).toMatchObject({ credits: 5, price: 1.49 });
  });
  it('offers 10 outfits for 1.99 USD', () => {
    expect(TRYON_PACKS.find(pack => pack.key === 'tryon_10')).toMatchObject({ credits: 10, price: 1.99 });
  });
  it('prices each bigger pack lower per outfit', () => {
    const perOutfit = TRYON_PACKS.map(pack => pack.price / pack.credits);
    for (let i = 1; i < perOutfit.length; i++) expect(perOutfit[i]).toBeLessThan(perOutfit[i - 1]);
    expect(TRYON_PACKS).toHaveLength(3);
  });
  it('allows free users with no monthly allowance to spend one extra', () => {
    expect(canGenerateTryon(0, null, 1)).toBe(true);
    expect(canGenerateTryon(0, null, 0)).toBe(false);
  });
  it('allows Premium users with no daily allowance to spend extras', () => {
    expect(canGenerateTryon(10, 0, 15)).toBe(true);
    expect(canGenerateTryon(10, 0, 0)).toBe(false);
  });
  it('leaves 14 units after spending one of a 15 pack', () => {
    expect(availableTryonCredits(15, 1)).toBe(14);
  });
  it('never counts bought outfits against included monthly or daily limits', () => {
    const now = new Date('2026-10-27T04:00:00Z');
    const events = [{ plan_tier: 'premium', used_credit: true, created_at: now.toISOString() }];
    expect(calculateTryonQuota(events, 'premium', now)).toMatchObject({ tryonsLeft: 15, tryonsDailyLeft: 5 });
  });
  it('reuses payment IDs on retries while keeping individual units distinct', async () => {
    expect(await tryonLedgerId('session:0')).toBe(await tryonLedgerId('session:0'));
    expect(await tryonLedgerId('session:0')).not.toBe(await tryonLedgerId('session:1'));
  });
});