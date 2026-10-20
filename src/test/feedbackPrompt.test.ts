import { describe, expect, it } from 'vitest';
import {
  feedbackOutfitKey,
  feedbackTapStorageKey,
  getFeedbackTapCount,
  isLearningPromptTap,
  registerFeedbackTap,
  StorageLike,
} from '../lib/feedbackPrompt';

function fakeStorage(): StorageLike {
  const values = new Map<string, string>();
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
  };
}

describe('feedback learning prompt', () => {
  it('shows the message only every 5th distinct outfit', () => {
    const storage = fakeStorage();
    const counts = Array.from({ length: 12 }, (_, i) =>
      registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', `outfit-${i}`), storage),
    );
    expect(counts.map(c => c.count)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(counts.filter(c => c.isNewOutfit && isLearningPromptTap(c.count)).map(c => c.count)).toEqual([
      5, 10,
    ]);
  });

  it('does not count the same outfit twice when the user changes their mind', () => {
    const storage = fakeStorage();
    const outfit = feedbackOutfitKey('weekly_plans', 'plan-1');
    expect(registerFeedbackTap('user-1', outfit, storage)).toEqual({ count: 1, isNewOutfit: true });
    expect(registerFeedbackTap('user-1', outfit, storage)).toEqual({ count: 1, isNewOutfit: false });
    expect(registerFeedbackTap('user-1', outfit, storage)).toEqual({ count: 1, isNewOutfit: false });
    expect(getFeedbackTapCount('user-1', storage)).toBe(1);
  });

  it('keeps the message hidden when re-tapping an already counted outfit at the 5th slot', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 4; i += 1) {
      registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', `outfit-${i}`), storage);
    }
    const fifth = registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-4'), storage);
    expect(isLearningPromptTap(fifth.count) && fifth.isNewOutfit).toBe(true);
    const again = registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-4'), storage);
    expect(again).toEqual({ count: 5, isNewOutfit: false });
    expect(again.isNewOutfit && isLearningPromptTap(again.count)).toBe(false);
  });

  it('keeps the counter between visits', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 4; i += 1) {
      registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', `outfit-${i}`), storage);
    }
    expect(getFeedbackTapCount('user-1', storage)).toBe(4);
    const fifth = registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-4'), storage);
    expect(fifth.isNewOutfit && isLearningPromptTap(fifth.count)).toBe(true);
    expect(getFeedbackTapCount('user-1', storage)).toBe(5);
  });

  it('counts each account separately', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 4; i += 1) {
      registerFeedbackTap('ana', feedbackOutfitKey('outfit_history', `outfit-${i}`), storage);
    }
    expect(getFeedbackTapCount('lucas', storage)).toBe(0);
    const lucas = registerFeedbackTap('lucas', feedbackOutfitKey('outfit_history', 'outfit-l'), storage);
    expect(lucas.isNewOutfit && isLearningPromptTap(lucas.count)).toBe(false);
    const ana = registerFeedbackTap('ana', feedbackOutfitKey('outfit_history', 'outfit-4'), storage);
    expect(ana.isNewOutfit && isLearningPromptTap(ana.count)).toBe(true);
  });

  it('continues from the old counter that only stored a number', () => {
    const storage = fakeStorage();
    storage.setItem(feedbackTapStorageKey('user-1'), '3');
    expect(getFeedbackTapCount('user-1', storage)).toBe(3);
    const next = registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-a'), storage);
    expect(next).toEqual({ count: 4, isNewOutfit: true });
    const fifth = registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-b'), storage);
    expect(fifth.isNewOutfit && isLearningPromptTap(fifth.count)).toBe(true);
  });

  it('restarts from zero when the saved counter is unusable', () => {
    const storage = fakeStorage();
    storage.setItem(feedbackTapStorageKey('user-1'), 'no-es-un-numero');
    expect(getFeedbackTapCount('user-1', storage)).toBe(0);
    expect(registerFeedbackTap('user-1', feedbackOutfitKey('outfit_history', 'outfit-a'), storage)).toEqual({
      count: 1,
      isNewOutfit: true,
    });
  });
});
