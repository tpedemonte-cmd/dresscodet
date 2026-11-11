import { describe, expect, it, vi } from 'vitest';
import { retryOnUnauthorized } from '@/lib/retryOnUnauthorized';

const unauthorized = { data: null, error: { context: { status: 401 } } };
const ok = { data: { fine: true }, error: null };

describe('retryOnUnauthorized', () => {
  it('renews the session and retries once after a 401', async () => {
    const call = vi.fn().mockResolvedValueOnce(unauthorized).mockResolvedValueOnce(ok);
    const renew = vi.fn().mockResolvedValue(true);
    expect(await retryOnUnauthorized(call, renew)).toBe(ok);
    expect(call).toHaveBeenCalledTimes(2);
    expect(renew).toHaveBeenCalledTimes(1);
  });

  it('does not retry when the session cannot be renewed', async () => {
    const call = vi.fn().mockResolvedValue(unauthorized);
    expect(await retryOnUnauthorized(call, vi.fn().mockResolvedValue(false))).toBe(unauthorized);
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('does not retry other errors such as a quota limit', async () => {
    const limited = { data: null, error: { context: { status: 429 } } };
    const call = vi.fn().mockResolvedValue(limited);
    const renew = vi.fn();
    expect(await retryOnUnauthorized(call, renew)).toBe(limited);
    expect(renew).not.toHaveBeenCalled();
  });
});
