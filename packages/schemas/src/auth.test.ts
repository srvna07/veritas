import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  passwordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updateUserRoleSchema,
} from './auth';

describe('passwordSchema', () => {
  it('accepts a reasonable password', () => {
    expect(passwordSchema.safeParse('correct horse 42').success).toBe(true);
  });
  it.each([
    ['too short', 'abc12'],
    ['no digit', 'abcdefghijkl'],
    ['no letter', '1234567890123'],
    ['too long', 'a1'.repeat(65)],
  ])('rejects %s', (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe('signInSchema', () => {
  it('normalises the email', () => {
    const r = signInSchema.parse({ email: '  User@Example.COM ', password: 'x' });
    expect(r.email).toBe('user@example.com');
  });
  it('rejects an invalid email', () => {
    expect(signInSchema.safeParse({ email: 'nope', password: 'x' }).success).toBe(false);
  });
});

describe('signUpSchema', () => {
  const base = {
    name: 'Asha',
    email: 'asha@example.com',
    password: 'correct horse 42',
    confirmPassword: 'correct horse 42',
  };
  it('accepts valid input', () => {
    expect(signUpSchema.safeParse(base).success).toBe(true);
  });
  it('rejects mismatched passwords', () => {
    const r = signUpSchema.safeParse({ ...base, confirmPassword: 'different 12345' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['confirmPassword']);
  });
  it('does not accept a role from the client', () => {
    const r = signUpSchema.parse({ ...base, role: 'admin' });
    expect(r).not.toHaveProperty('role');
  });
});

describe('forgot/reset schemas', () => {
  it('validates forgot-password email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.co' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: 'bad' }).success).toBe(false);
  });
  it('requires a plausible token and matching passwords', () => {
    const token = 'x'.repeat(43);
    const pw = 'correct horse 42';
    expect(
      resetPasswordSchema.safeParse({ token, password: pw, confirmPassword: pw }).success,
    ).toBe(true);
    expect(
      resetPasswordSchema.safeParse({ token: 'short', password: pw, confirmPassword: pw }).success,
    ).toBe(false);
  });
});

describe('updateUserRoleSchema', () => {
  it('only allows known roles and uuids', () => {
    const userId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
    expect(updateUserRoleSchema.safeParse({ userId, role: 'admin' }).success).toBe(true);
    expect(updateUserRoleSchema.safeParse({ userId, role: 'superuser' }).success).toBe(false);
    expect(updateUserRoleSchema.safeParse({ userId: 'nope', role: 'admin' }).success).toBe(false);
  });
});
