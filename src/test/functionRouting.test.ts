import { describe, expect, it } from 'vitest';
import { functionHost } from '@/lib/functionRouting';

const on = { externalData: true, ownFunctionsEnabled: true };

describe('functionHost', () => {
  it('sends the five non-AI functions to the own project when enabled', () => {
    for (const name of ['mock-payments', 'save-photo-model', 'search-marketplace', 'extract-ml-product', 'refresh-plan-weather']) {
      expect(functionHost(name, on)).toBe('own');
    }
  });

  it('keeps every AI function on Lovable Cloud even when enabled', () => {
    for (const name of ['detect-clothing', 'recommend-outfit', 'virtual-tryon', 'generate-avatar', 'travel-wardrobe', 'style-recommendations']) {
      expect(functionHost(name, on)).toBe('cloud');
    }
  });

  it('keeps everything on Lovable Cloud while the switch is off', () => {
    expect(functionHost('mock-payments', { externalData: true, ownFunctionsEnabled: false })).toBe('cloud');
  });

  it('keeps everything on Lovable Cloud when the app uses Lovable data', () => {
    expect(functionHost('mock-payments', { externalData: false, ownFunctionsEnabled: true })).toBe('cloud');
  });
});
