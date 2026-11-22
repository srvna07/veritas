import { describe, expect, it } from 'vitest';
import { generateResetToken, hashToken } from './tokens';

describe('reset tokens', () => {
  it('generates unique, url-safe tokens with a matching hash', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(hashToken(a.token));
  });

  it('never stores the raw token as its hash', () => {
    const { token, tokenHash } = generateResetToken();
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
