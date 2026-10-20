import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { applyRecordedTryon } from '../lib/tryonQuotaCache';

describe('confirmed try-on quota updates', () => {
  it('immediately decreases Premium availability from 15/5 to 14/4 without a network read', async () => {
    const client = new QueryClient();
    const key = ['ai_quota', 'account', true, 'month', 'day'];
    client.setQueryData(key, { tryonsThisMonth: 0, tryonsToday: 0, avatarCredits: 2 });
    await applyRecordedTryon(client, key);
    const usage = client.getQueryData<{ tryonsThisMonth: number; tryonsToday: number; avatarCredits: number }>(key);
    expect(15 - (usage?.tryonsThisMonth ?? 0)).toBe(14);
    expect(5 - (usage?.tryonsToday ?? 0)).toBe(4);
    expect(usage?.avatarCredits).toBe(2);
  });

  it('updates only the account and plan that generated the outfit', async () => {
    const client = new QueryClient();
    const free = ['ai_quota', 'account', false];
    const premium = ['ai_quota', 'account', true];
    const other = ['ai_quota', 'other', true];
    for (const key of [free, premium, other]) client.setQueryData(key, { tryonsThisMonth: 0, tryonsToday: 0 });
    await applyRecordedTryon(client, premium);
    expect(client.getQueryData(premium)).toEqual({ tryonsThisMonth: 1, tryonsToday: 1 });
    expect(client.getQueryData(free)).toEqual({ tryonsThisMonth: 0, tryonsToday: 0 });
    expect(client.getQueryData(other)).toEqual({ tryonsThisMonth: 0, tryonsToday: 0 });
  });

  it('cancels a stale read before applying the confirmed generation', async () => {
    const client = new QueryClient();
    const key = ['ai_quota', 'account', true];
    client.setQueryData(key, { tryonsThisMonth: 0, tryonsToday: 0 });
    let resolveRead: ((counts: { tryonsThisMonth: number; tryonsToday: number }) => void) | undefined;
    const read = client.fetchQuery({ queryKey: key, queryFn: () => new Promise(resolve => { resolveRead = resolve; }) });
    const settled = read.catch(() => undefined);
    await applyRecordedTryon(client, key);
    resolveRead?.({ tryonsThisMonth: 0, tryonsToday: 0 });
    await settled;
    expect(client.getQueryData(key)).toEqual({ tryonsThisMonth: 1, tryonsToday: 1 });
  });
});