import { describe, expect, it } from 'vitest';
import {
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
  it('marks only every 5th feedback tap', () => {
    const storage = fakeStorage();
    const counts = Array.from({ length: 12 }, () => registerFeedbackTap('user-1', storage));
    expect(counts).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(counts.filter(isLearningPromptTap)).toEqual([5, 10]);
  });

  it('keeps the counter between visits', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 4; i += 1) registerFeedbackTap('user-1', storage);
    expect(getFeedbackTapCount('user-1', storage)).toBe(4);
    expect(isLearningPromptTap(registerFeedbackTap('user-1', storage))).toBe(true);
    expect(getFeedbackTapCount('user-1', storage)).toBe(5);
  });

  it('counts each account separately', () => {
    const storage = fakeStorage();
    for (let i = 0; i < 4; i += 1) registerFeedbackTap('ana', storage);
    expect(getFeedbackTapCount('lucas', storage)).toBe(0);
    expect(isLearningPromptTap(registerFeedbackTap('lucas', storage))).toBe(false);
    expect(isLearningPromptTap(registerFeedbackTap('ana', storage))).toBe(true);
  });

  it('restarts from zero when the saved counter is unusable', () => {
    const storage = fakeStorage();
    storage.setItem(feedbackTapStorageKey('user-1'), 'no-es-un-numero');
    expect(getFeedbackTapCount('user-1', storage)).toBe(0);
    expect(registerFeedbackTap('user-1', storage)).toBe(1);
  });
});
