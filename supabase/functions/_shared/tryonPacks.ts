export type TryonPackKey = 'tryon_1' | 'tryon_5' | 'tryon_10';

// Estimated image cost: ~0.15 credits × USD 0.30 per purchased credit.
// Sale prices include headroom, but do not promise net profit after taxes/fees.
export const TRYON_PACKS: { key: TryonPackKey; credits: number; price: number; title: string; note: string }[] = [
  { key: 'tryon_1', credits: 1, price: 0.99, title: '1 outfit extra', note: 'Para probar una combinación más' },
  { key: 'tryon_5', credits: 5, price: 1.49, title: 'Pack de 5 outfits extra', note: 'Varias combinaciones al mejor precio' },
  { key: 'tryon_10', credits: 10, price: 1.99, title: 'Pack de 10 outfits extra', note: 'La opción más conveniente' },
];

/** Stable ledger IDs make payment retries and consumption idempotent. */
export async function tryonLedgerId(source: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source));
  const hex = Array.from(new Uint8Array(digest).slice(0, 16), b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20)}`;
}

export function availableTryonCredits(granted: number, spent: number) {
  return Math.max(0, granted - spent);
}

export function canGenerateTryon(monthLeft: number, dayLeft: number | null, credits: number) {
  return (monthLeft > 0 && dayLeft !== 0) || credits > 0;
}