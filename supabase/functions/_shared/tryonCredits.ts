import { adminClient } from './backend.ts';
import type { DataBackend } from './backendSelection.ts';
import { tryonLedgerId, availableTryonCredits } from './tryonPacks.ts';

/** Credits are permanent service-written events, separate from monthly plan usage. */
export async function readTryonCredits(backend: DataBackend | undefined, userId: string) {
  const admin = adminClient(backend);
  const [grants, spent] = await Promise.all([
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'tryon_credit'),
    admin.from('ai_usage_events').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'tryon').eq('used_credit', true),
  ]);
  if (grants.error) throw grants.error;
  if (spent.error) throw spent.error;
  return availableTryonCredits(grants.count ?? 0, spent.count ?? 0);
}

export async function grantTryonPack(backend: DataBackend, userId: string, sessionId: string, quantity: number) {
  const admin = adminClient(backend);
  const rows = await Promise.all(Array.from({ length: quantity }, async (_, index) => ({
    id: await tryonLedgerId(`tryon-pack:${sessionId}:${index}`),
    user_id: userId, kind: 'tryon_credit', used_credit: false, plan_tier: 'extra',
  })));
  // A single batch insert is atomic. Replayed confirmations cannot add credits twice.
  const { error } = await admin.from('ai_usage_events').upsert(rows, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
  return readTryonCredits(backend, userId);
}

/** Caller holds the account's generation lock until this write finishes. */
export async function spendTryonCredit(backend: DataBackend | undefined, userId: string) {
  const admin = adminClient(backend);
  const { data: grants, error } = await admin.from('ai_usage_events').select('id')
    .eq('user_id', userId).eq('kind', 'tryon_credit').order('created_at').limit(1000);
  if (error) throw error;
  for (const grant of grants ?? []) {
    const id = await tryonLedgerId(`tryon-spend:${grant.id}`);
    const { data: spent, error: readError } = await admin.from('ai_usage_events').select('id').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (spent) continue;
    const { error: spendError } = await admin.from('ai_usage_events').insert({
      id, user_id: userId, kind: 'tryon', used_credit: true, plan_tier: 'extra',
    });
    if (spendError?.code === '23505') continue;
    if (spendError) throw spendError;
    return;
  }
  throw new Error('No quedan outfits extra. Comprá otro pack para continuar.');
}