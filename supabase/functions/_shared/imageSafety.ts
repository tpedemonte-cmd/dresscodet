// Detects when the image provider refused to draw the result for safety reasons
// (for example IMAGE_SAFETY), so callers can retry with a gentler prompt.
export function isSafetyBlock(errorText: string | undefined | null): boolean {
  if (!errorText) return false;
  return /IMAGE_SAFETY|content blocked|SAFETY|PROHIBITED_CONTENT|blocked by the provider/i.test(errorText);
}

// Extra wording appended on the retry: keeps the person fully and modestly dressed
// at every step and avoids "remove clothing" phrasing that triggers safety filters.
export const SAFE_TRYON_SUFFIX = `
SAFETY NOTE: This is a family-friendly fashion catalog photo. The person is always fully and modestly dressed. Do not depict undressing: simply show the person already wearing the selected garments, with any unselected areas covered by a plain neutral basic outfit. Bare feet only.`;
