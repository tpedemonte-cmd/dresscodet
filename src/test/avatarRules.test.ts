import { describe, expect, it } from 'vitest';
import { canDeleteAvatar, freeAvatarAllowance, needsLastAvatarConfirmation } from '../../supabase/functions/_shared/avatarRules';

describe('free avatar replacement rules', () => {
  it('requires confirmation only for the last available avatar', () => {
    expect(needsLastAvatarConfirmation(1)).toBe(true);
    expect(needsLastAvatarConfirmation(2)).toBe(false);
    expect(needsLastAvatarConfirmation(0)).toBe(false);
  });
  it('allows exactly one initial free generation', () => {
    expect(freeAvatarAllowance(0, 0, 0)).toBe(1);
    expect(freeAvatarAllowance(1, 0, 0)).toBe(0);
  });
  it('blocks deleting the final model without purchased credits', () => {
    expect(canDeleteAvatar(false, 0)).toBe(false);
  });
  it('allows deletion with purchased credits', () => {
    expect(canDeleteAvatar(false, 3)).toBe(true);
  });
  it('requires deleting the saved model before generating a replacement', () => {
    expect(freeAvatarAllowance(1, 3, 1)).toBe(0);
    expect(freeAvatarAllowance(1, 3, 0)).toBe(3);
  });
  it('locks the last model after all three extra generations', () => {
    for (let used = 0; used < 3; used++) {
      expect(freeAvatarAllowance(1 + used, 3 - used, 0)).toBe(3 - used);
    }
    expect(freeAvatarAllowance(4, 0, 1)).toBe(0);
    expect(canDeleteAvatar(false, 0)).toBe(false);
  });
  it('preserves premium deletion', () => {
    expect(canDeleteAvatar(true, 0)).toBe(true);
  });
});