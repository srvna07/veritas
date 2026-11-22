import { describe, expect, it } from 'vitest';
import { hashPassword, verifyAgainstDummy, verifyPassword } from './password';

describe('password hashing', () => {
  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse 42');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse 42', hash)).toBe(true);
    expect(await verifyPassword('wrong horse 42', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    const [a, b] = await Promise.all([
      hashPassword('same-password-1'),
      hashPassword('same-password-1'),
    ]);
    expect(a).not.toBe(b);
  });

  it('rejects malformed stored hashes instead of throwing', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('x', 'bcrypt$1$2$3$4$5')).toBe(false);
  });

  it('dummy verification always returns false', async () => {
    expect(await verifyAgainstDummy('anything')).toBe(false);
  });
});
