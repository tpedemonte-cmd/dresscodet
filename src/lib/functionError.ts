type InvokeResult = { data: unknown; error: unknown };

/**
 * When a server function answers with an error status, the client only says
 * "Edge Function returned a non-2xx status code". This copies the readable
 * message the function sent ({ error: "..." }) into the error, so screens show it.
 */
export async function withReadableError<T extends InvokeResult>(result: T): Promise<T> {
  const error = result.error as { message?: string; context?: unknown } | null;
  const context = error?.context as { clone?: () => Response; json?: () => Promise<unknown> } | undefined;
  if (!error || !context || typeof context.json !== 'function') return result;
  try {
    const source = typeof context.clone === 'function' ? context.clone() : (context as Response);
    const body = (await source.json()) as { error?: unknown } | null;
    if (body && typeof body.error === 'string' && body.error.trim()) error.message = body.error;
  } catch {
    // Body was not JSON: keep the original message.
  }
  return result;
}
