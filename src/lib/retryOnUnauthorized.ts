type InvokeResult = { data: unknown; error: unknown };

function statusOf(error: unknown): number | undefined {
  const context = (error as { context?: { status?: unknown } } | null)?.context;
  return typeof context?.status === 'number' ? context.status : undefined;
}

/**
 * Runs a function call and, if the server rejects the session (401),
 * renews the session once and retries. Any other result is returned as is.
 */
export async function retryOnUnauthorized<T extends InvokeResult>(
  call: () => Promise<T>,
  renewSession: () => Promise<boolean>,
): Promise<T> {
  const first = await call();
  if (!first.error || statusOf(first.error) !== 401) return first;
  const renewed = await renewSession().catch(() => false);
  if (!renewed) return first;
  return call();
}
