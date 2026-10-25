import type { Session, SupabaseClient } from '@supabase/supabase-js';

// A startup read must never overwrite a newer sign-in or sign-out event.
export function subscribeAuthSession(
  auth: Pick<SupabaseClient['auth'], 'getSession' | 'onAuthStateChange'>,
  onSession: (session: Session | null) => void,
) {
  let active = true;
  let revision = 0;
  const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
    revision += 1;
    if (active) onSession(session);
  });
  const readRevision = revision;
  void auth.getSession().then(({ data, error }) => {
    if (active && revision === readRevision && !error) onSession(data.session);
  }).catch(() => {
    // INITIAL_SESSION remains the authoritative startup notification.
  });
  return () => {
    active = false;
    subscription.unsubscribe();
  };
}