import { useSyncExternalStore, type Dispatch, type SetStateAction } from 'react';

/** Account-scoped session drafts outlive routes, including requests finishing off-screen. */
export function createTryonDraftStore() {
  const accounts = new Map<string, Map<string, unknown>>();
  const listeners = new Set<() => void>();
  return {
    read<T>(account: string, field: string, initial: T): T {
      let draft = accounts.get(account);
      if (!draft) {
        draft = new Map();
        accounts.set(account, draft);
      }
      if (!draft.has(field)) draft.set(field, initial);
      return draft.get(field) as T;
    },
    write<T>(account: string, field: string, initial: T, action: SetStateAction<T>) {
      const previous = this.read(account, field, initial);
      const next = typeof action === 'function'
        ? (action as (value: T) => T)(previous)
        : action;
      accounts.get(account)?.set(field, next);
      listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}

const drafts = createTryonDraftStore();

export function useTryonDraftState<T>(account: string, field: string, initial: T): [T, Dispatch<SetStateAction<T>>] {
  const value = useSyncExternalStore(drafts.subscribe, () => drafts.read(account, field, initial));
  return [value, action => drafts.write(account, field, initial, action)];
}