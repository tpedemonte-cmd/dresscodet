export const FEEDBACK_LEARNING_PROMPT_EVERY = 5;

export const FEEDBACK_LEARNING_MESSAGE =
  '¡Gracias! Tu opinión ayuda a la IA a aprender tus gustos.';

const STORAGE_PREFIX = 'dresscode_feedback_taps';
const MAX_TRACKED_OUTFITS = 300;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface FeedbackTapResult {
  /** Outfits distintos con feedback guardado hasta ahora. */
  count: number;
  /** false si este outfit ya había sumado antes (cambiar de opinión no cuenta otra vez). */
  isNewOutfit: boolean;
}

const memoryFallback = new Map<string, string>();

function resolveStorage(storage?: StorageLike): StorageLike {
  if (storage) return storage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return {
    getItem: key => memoryFallback.get(key) ?? null,
    setItem: (key, value) => {
      memoryFallback.set(key, value);
    },
  };
}

export function feedbackTapStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

/** Identifica un outfit concreto para no contarlo dos veces. */
export function feedbackOutfitKey(table: string, recordId: string): string {
  return `${table}:${recordId}`;
}

interface CounterState {
  /** Outfits ya olvidados por el tope de seguimiento, más los contadores viejos. */
  base: number;
  outfits: string[];
}

function readState(raw: string | null): CounterState {
  if (!raw) return { base: 0, outfits: [] };
  try {
    const parsed = JSON.parse(raw) as { base?: unknown; outfits?: unknown };
    if (parsed && typeof parsed === 'object') {
      const base = Number.isFinite(parsed.base) ? Math.max(0, Number(parsed.base)) : 0;
      const outfits = Array.isArray(parsed.outfits)
        ? parsed.outfits.filter((x): x is string => typeof x === 'string' && x.length > 0)
        : [];
      return { base, outfits };
    }
  } catch {
    // Contador viejo: era un número suelto.
  }
  const legacy = Number.parseInt(raw, 10);
  if (Number.isFinite(legacy) && legacy > 0) return { base: legacy, outfits: [] };
  return { base: 0, outfits: [] };
}

function writeState(userId: string | null | undefined, state: CounterState, storage?: StorageLike) {
  const key = feedbackTapStorageKey(userId);
  const value = JSON.stringify({ base: state.base, outfits: state.outfits });
  try {
    resolveStorage(storage).setItem(key, value);
  } catch {
    // Modo incógnito o storage lleno: seguimos contando en memoria durante esta sesión.
    memoryFallback.set(key, value);
  }
}

export function getFeedbackTapCount(userId?: string | null, storage?: StorageLike): number {
  const state = readState(resolveStorage(storage).getItem(feedbackTapStorageKey(userId)));
  return state.base + state.outfits.length;
}

export function registerFeedbackTap(
  userId?: string | null,
  outfitKey?: string | null,
  storage?: StorageLike,
): FeedbackTapResult {
  const state = readState(resolveStorage(storage).getItem(feedbackTapStorageKey(userId)));

  // Sin identificador de outfit no se puede saber si se repite: se cuenta igual que antes.
  if (!outfitKey) {
    const next = { base: state.base + 1, outfits: state.outfits };
    writeState(userId, next, storage);
    return { count: next.base + next.outfits.length, isNewOutfit: true };
  }

  if (state.outfits.includes(outfitKey)) {
    return { count: state.base + state.outfits.length, isNewOutfit: false };
  }

  const outfits = [...state.outfits, outfitKey];
  let { base } = state;
  const overflow = outfits.length - MAX_TRACKED_OUTFITS;
  if (overflow > 0) {
    outfits.splice(0, overflow);
    base += overflow;
  }

  writeState(userId, { base, outfits }, storage);
  return { count: base + outfits.length, isNewOutfit: true };
}

export function isLearningPromptTap(count: number): boolean {
  return count > 0 && count % FEEDBACK_LEARNING_PROMPT_EVERY === 0;
}
