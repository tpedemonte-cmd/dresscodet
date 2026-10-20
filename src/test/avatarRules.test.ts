import { describe, expect, it } from 'vitest';
import { canDeleteAvatar, freeAvatarAllowance, isSavedAvatarSelected, isAvatarHeightValid, isAvatarWeightValid, needsLastAvatarConfirmation, needsLastAvatarDeletionConfirmation, avatarOptionCount, generateAvatarOptions } from '../../supabase/functions/_shared/avatarRules';

describe('try-on outfit requires a saved avatar', () => {
  it('blocks outfit generation while the avatar is unsaved', () => {
    expect(isSavedAvatarSelected('data:image/png;base64,abc', [], false)).toBe(false);
    expect(isSavedAvatarSelected('data:image/png;base64,abc', ['https://cdn/model.png'], false)).toBe(false);
  });
  it('allows outfit generation once the avatar is saved', () => {
    expect(isSavedAvatarSelected('https://cdn/model.png', ['https://cdn/model.png'], false)).toBe(true);
  });
  it('always allows the try-on with an own photo', () => {
    expect(isSavedAvatarSelected('data:image/jpeg;base64,photo', [], true)).toBe(true);
  });
  it('blocks when there is no model at all', () => {
    expect(isSavedAvatarSelected(null, [], false)).toBe(false);
    expect(isSavedAvatarSelected(null, [], true)).toBe(false);
  });
});


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
  it('premium can delete even without a purchased pack', () => {
    expect(canDeleteAvatar(true, 0)).toBe(true);
    expect(canDeleteAvatar(true, 1)).toBe(true);
  });
  it('requires confirmation before deleting the last saved premium avatar', () => {
    expect(needsLastAvatarDeletionConfirmation(true, 1)).toBe(true);
    expect(needsLastAvatarDeletionConfirmation(true, 2)).toBe(false);
    expect(needsLastAvatarDeletionConfirmation(true, 0)).toBe(false);
    expect(needsLastAvatarDeletionConfirmation(false, 1)).toBe(false);
  });
  it('premium has only one lifetime initial generation, not a monthly renewal', () => {
    expect(freeAvatarAllowance(0, 0, 0)).toBe(1);
    expect(freeAvatarAllowance(1, 0, 0)).toBe(0);
    expect(freeAvatarAllowance(10, 0, 0)).toBe(0);
    expect(freeAvatarAllowance(1, 3, 0)).toBe(3);
  });
  it('offers three premium options and one free option', () => {
    expect(avatarOptionCount(true)).toBe(3);
    expect(avatarOptionCount(false)).toBe(1);
  });
  it('charges exactly one generation for all three premium options', async () => {
    let recorded = 0;
    const options = await generateAvatarOptions(true, async (i) => `image-${i}`, async () => { recorded++; });
    expect(options).toEqual(['image-0', 'image-1', 'image-2']);
    expect(recorded).toBe(1);
  });
  it('does not consume a credit if any option fails', async () => {
    let recorded = 0;
    await expect(generateAvatarOptions(true, async (i) => {
      if (i === 1) throw new Error('generation failed');
      return 'image';
    }, async () => { recorded++; })).rejects.toThrow('generation failed');
    expect(recorded).toBe(0);
  });
});