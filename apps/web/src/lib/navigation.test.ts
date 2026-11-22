import { describe, expect, it } from 'vitest';
import { DEFAULT_REDIRECT, safeNextPath } from './navigation';

describe('safeNextPath', () => {
  it('keeps same-origin paths', () => {
    expect(safeNextPath('/dashboard')).toBe('/dashboard');
    expect(safeNextPath('/projects/42?tab=runs')).toBe('/projects/42?tab=runs');
  });

  it('falls back for missing values', () => {
    expect(safeNextPath(undefined)).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath(null)).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('')).toBe(DEFAULT_REDIRECT);
  });

  it('blocks open redirects', () => {
    expect(safeNextPath('https://evil.example.com')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('//evil.example.com')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('/\\evil.example.com')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('javascript:alert(1)')).toBe(DEFAULT_REDIRECT);
    expect(safeNextPath('/ok\n//evil')).toBe(DEFAULT_REDIRECT);
  });

  it('uses the first value of repeated params', () => {
    expect(safeNextPath(['/dashboard', '/other'])).toBe('/dashboard');
  });

  it('rejects overly long values', () => {
    expect(safeNextPath(`/${'a'.repeat(600)}`)).toBe(DEFAULT_REDIRECT);
  });
});
