import { describe, expect, it } from 'vitest';
import { isSafetyBlock } from '../../supabase/functions/_shared/imageSafety';
import { withReadableError } from '@/lib/functionError';

describe('isSafetyBlock', () => {
  it('detects the provider IMAGE_SAFETY refusal', () => {
    expect(isSafetyBlock('{"error":{"message":"content blocked by the provider (IMAGE_SAFETY)"}}')).toBe(true);
  });
  it('does not treat rate limits as safety blocks', () => {
    expect(isSafetyBlock('{"error":{"message":"rate limit exceeded"}}')).toBe(false);
    expect(isSafetyBlock(undefined)).toBe(false);
  });
});

describe('withReadableError', () => {
  it('replaces the generic non-2xx message with the function message', async () => {
    const error = Object.assign(new Error('Edge Function returned a non-2xx status code'), {
      context: new Response(JSON.stringify({ error: 'No se pudo generar la imagen.' }), { status: 500 }),
    });
    const result = await withReadableError({ data: null, error });
    expect((result.error as Error).message).toBe('No se pudo generar la imagen.');
  });
  it('keeps the original message when the body is not JSON', async () => {
    const error = Object.assign(new Error('original'), { context: new Response('oops', { status: 500 }) });
    const result = await withReadableError({ data: null, error });
    expect((result.error as Error).message).toBe('original');
  });
});
