export function canDeleteAvatar(_isPremium: boolean, credits: number) {
  return credits > 0;
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