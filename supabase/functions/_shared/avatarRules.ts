export function canDeleteAvatar(isPremium: boolean, credits: number) {
  return isPremium || credits > 0;
}

export function needsLastAvatarConfirmation(available: number) {
  return available === 1;
}

export function freeAvatarAllowance(total: number, credits: number, savedModels: number) {
  return savedModels > 0 ? 0 : Math.max(0, 1 - total) + Math.max(0, credits);
}