export function canDeleteAvatar(isPremium: boolean, credits: number) {
  return isPremium || credits > 0;
}

export function needsLastAvatarDeletionConfirmation(isPremium: boolean, savedModels: number) {
  return isPremium && savedModels === 1;
}

export function avatarOptionCount(isPremium: boolean) {
  return isPremium ? 3 : 1;
}

/** One batch of options consumes one generation, only after every option succeeds. */
export async function generateAvatarOptions<T>(isPremium: boolean, generate: (index: number) => Promise<T>, record: () => Promise<void>) {
  const options: T[] = [];
  for (let i = 0; i < avatarOptionCount(isPremium); i++) options.push(await generate(i));
  await record();
  return options;
}

export function needsLastAvatarConfirmation(available: number) {
  return available === 1;
}

export function freeAvatarAllowance(total: number, credits: number, savedModels: number) {
  return savedModels > 0 ? 0 : Math.max(0, 1 - total) + Math.max(0, credits);
}

/** The try-on outfit can only be generated with a saved avatar; own-photo mode is always allowed. */
export function isSavedAvatarSelected(selfie: string | null, savedModelUrls: string[], usesOwnPhoto: boolean) {
  if (!selfie) return false;
  if (usesOwnPhoto) return true;
  return savedModelUrls.includes(selfie);
}