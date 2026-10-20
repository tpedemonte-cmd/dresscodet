import type { QueryClient, QueryKey } from '@tanstack/react-query';

interface TryonCounts {
  tryonsThisMonth: number;
  tryonsToday: number;
}

/** Called only after the server confirms a successfully recorded generation. */
export async function applyRecordedTryon(queryClient: QueryClient, queryKey: QueryKey) {
  // An older in-flight read must not overwrite the confirmed generation.
  await queryClient.cancelQueries({ queryKey, exact: true });
  queryClient.setQueryData<TryonCounts>(queryKey, previous => previous ? {
    ...previous,
    tryonsThisMonth: previous.tryonsThisMonth + 1,
    tryonsToday: previous.tryonsToday + 1,
  } : previous);
  // Reconcile in the background; the visible counters already reflect success.
  void queryClient.invalidateQueries({ queryKey, exact: true });
}