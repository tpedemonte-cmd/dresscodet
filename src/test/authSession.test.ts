import { describe, expect, it, vi } from 'vitest';
import type { Session, SupabaseClient, AuthChangeEvent } from '@supabase/supabase-js';
import { subscribeAuthSession } from '../lib/authSession';

function fixture() {
  let notify: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  let resolveRead: ((value: { data: { session: Session | null }; error: null }) => void) | undefined;
  const unsubscribe = vi.fn();
  const auth = {
    onAuthStateChange: vi.fn((callback) => {
      notify = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
    getSession: vi.fn(() => new Promise(resolve => { resolveRead = resolve; })),
  } as unknown as Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'>;
  return { auth, unsubscribe, emit: (event: AuthChangeEvent, session: Session | null) => notify?.(event, session), resolve: (session: Session | null) => resolveRead?.({ data: { session }, error: null }) };
}

const saved = { user: { id: 'returning-account' } } as Session;
describe('remembered sign-in', () => {
  it('does not send a signed-in account back to login when an older empty startup read finishes', async () => {
    const f = fixture(); const apply = vi.fn();
    subscribeAuthSession(f.auth, apply);
    f.emit('SIGNED_IN', saved);
    f.resolve(null);
    await Promise.resolve();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenLastCalledWith(saved);
  });
  it('does not resurrect a session after explicit sign-out', async () => {
    const f = fixture(); const apply = vi.fn();
    subscribeAuthSession(f.auth, apply);
    f.emit('SIGNED_OUT', null); f.resolve(saved);
    await Promise.resolve();
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply).toHaveBeenLastCalledWith(null);
  });
  it('restores the stored session when no newer event occurs', async () => {
    const f = fixture(); const apply = vi.fn();
    subscribeAuthSession(f.auth, apply); f.resolve(saved);
    await Promise.resolve();
    expect(apply).toHaveBeenLastCalledWith(saved);
  });
  it('ignores pending reads after unmount', async () => {
    const f = fixture(); const apply = vi.fn();
    subscribeAuthSession(f.auth, apply)(); f.resolve(saved);
    await Promise.resolve();
    expect(apply).not.toHaveBeenCalled();
    expect(f.unsubscribe).toHaveBeenCalledOnce();
  });
});