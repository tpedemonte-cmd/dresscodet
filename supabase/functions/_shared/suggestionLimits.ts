// Límite diario de sugerencias de outfit por plan.
// null = sin límite diario (Premium).
export const FREE_SUGGESTIONS_PER_DAY = 2;

export function suggestionDailyLimit(isPremium: boolean): number | null {
  return isPremium ? null : FREE_SUGGESTIONS_PER_DAY;
}

/** Sugerencias restantes hoy; null cuando el plan no tiene límite. */
export function suggestionsLeft(isPremium: boolean, usedToday: number): number | null {
  const limit = suggestionDailyLimit(isPremium);
  return limit === null ? null : Math.max(0, limit - usedToday);
}
