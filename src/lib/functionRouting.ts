// Functions that do not use AI and can run inside the user's own data project.
// The AI functions always stay on Lovable Cloud, where the AI credits live.
export const OWN_PROJECT_FUNCTIONS = [
  'mock-payments',
  'save-photo-model',
  'search-marketplace',
  'extract-ml-product',
  'refresh-plan-weather',
] as const;

export type FunctionHost = 'own' | 'cloud';

/**
 * Decides where a function call goes. A function only runs in the own project when
 * the app uses the own data project AND the own-functions switch is on, so turning the
 * switch on before the functions are uploaded is the only way to break these calls.
 */
export function functionHost(
  name: string,
  { externalData, ownFunctionsEnabled }: { externalData: boolean; ownFunctionsEnabled: boolean },
): FunctionHost {
  if (!externalData || !ownFunctionsEnabled) return 'cloud';
  return (OWN_PROJECT_FUNCTIONS as readonly string[]).includes(name) ? 'own' : 'cloud';
}
