export const FEEDBACK_LEARNING_PROMPT_EVERY = 5;

export const FEEDBACK_LEARNING_MESSAGE =
  '¡Gracias! Tu opinión ayuda a la IA a aprender tus gustos.';

const STORAGE_PREFIX = 'dresscode_feedback_taps';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
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

export function getFeedbackTapCount(userId?: string | null, storage?: StorageLike): number {
  const raw = resolveStorage(storage).getItem(feedbackTapStorageKey(userId));
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function registerFeedbackTap(userId?: string | null, storage?: StorageLike): number {
  const next = getFeedbackTapCount(userId, storage) + 1;
  try {
    resolveStorage(storage).setItem(feedbackTapStorageKey(userId), String(next));
  } catch {
    // Private mode or full storage: keep counting in memory for this session.
    memoryFallback.set(feedbackTapStorageKey(userId), String(next));
  }
  return next;
}

export function isLearningPromptTap(count: number): boolean {
  return count > 0 && count % FEEDBACK_LEARNING_PROMPT_EVERY === 0;
}
