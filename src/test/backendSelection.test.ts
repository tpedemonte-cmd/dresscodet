import { describe, expect, it } from 'vitest';
import { selectDataBackend } from '../../supabase/functions/_shared/backendSelection';

describe('isolated data backend selection', () => {
  it('routes external accounts to their own database', () => {
    expect(selectDataBackend('external')).toBe('external');
  });
  it('preserves the existing Cloud preview connection', () => {
    expect(selectDataBackend(null)).toBe('cloud');
    expect(selectDataBackend('cloud')).toBe('cloud');
  });
  it('rejects arbitrary destinations rather than forwarding credentials', () => {
    expect(() => selectDataBackend('https://other.example')).toThrow();
  });
});