import { describe, expect, it } from 'vitest';
import { createTryonDraftStore } from '../lib/tryonDraft';

describe('Try-on navigation drafts', () => {
  it('restores the exact unsaved avatar without generating or consuming another pack attempt', () => {
    const store = createTryonDraftStore();
    let credits = 3;
    let requests = 0;
    const generate = () => {
      requests++;
      credits--;
      store.write<string | null>('user', 'selfie', null, 'generated-avatar-1');
    };
    generate();
    // A new route mount reads the draft instead of requesting another image.
    expect(store.read<string | null>('user', 'selfie', null)).toBe('generated-avatar-1');
    expect(store.read<string | null>('user', 'selfie', null)).toBe('generated-avatar-1');
    expect(requests).toBe(1);
    expect(credits).toBe(2);
  });

  it('retains all three premium options and the selected model', () => {
    const store = createTryonDraftStore();
    store.write('user', 'variants', [] as string[], ['image-1', 'image-2', 'image-3']);
    store.write<string | null>('user', 'selfie', null, 'image-2');
    expect(store.read('user', 'variants', [])).toEqual(['image-1', 'image-2', 'image-3']);
    expect(store.read('user', 'selfie', null)).toBe('image-2');
  });

  it('keeps drafts isolated between accounts', () => {
    const store = createTryonDraftStore();
    store.write<string | null>('first', 'selfie', null, 'private-avatar');
    expect(store.read('second', 'selfie', null)).toBeNull();
  });

  it('retains generation completion even after the page unsubscribes', () => {
    const store = createTryonDraftStore();
    const unsubscribe = store.subscribe(() => {});
    store.write('user', 'generatingAvatar', false, true);
    unsubscribe();
    store.write<string | null>('user', 'selfie', null, 'finished-image');
    store.write('user', 'generatingAvatar', false, false);
    expect(store.read('user', 'selfie', null)).toBe('finished-image');
    expect(store.read('user', 'generatingAvatar', false)).toBe(false);
  });
});