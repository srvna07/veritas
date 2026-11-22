import { describe, expect, it } from 'vitest';
import {
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
  roleCan,
  roleSchema,
  signupSchema,
  updateRoleSchema,
} from './index';

describe('roles', () => {
  it('only accepts contributor and admin', () => {
    expect(roleSchema.safeParse('contributor').success).toBe(true);
    expect(roleSchema.safeParse('admin').success).toBe(true);
    expect(roleSchema.safeParse('manager').success).toBe(false);
    expect(updateRoleSchema.safeParse({ role: 'root' }).success).toBe(false);
  });

  it('grants user management only to admin', () => {
    expect(roleCan('admin', 'users:read')).toBe(true);
    expect(roleCan('admin', 'users:manage_roles')).toBe(true);
    expect(roleCan('contributor', 'users:read')).toBe(false);
    expect(roleCan('contributor', 'users:manage_roles')).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('rejects short, letter-only, and digit-only passwords', () => {
    expect(passwordSchema.safeParse('abc123').success).toBe(false);
    expect(passwordSchema.safeParse('abcdefgh').success).toBe(false);
    expect(passwordSchema.safeParse('12345678').success).toBe(false);
  });

  it('rejects passwords over 72 bytes', () => {
    expect(passwordSchema.safeParse('a1'.repeat(37)).success).toBe(false);
    expect(passwordSchema.safeParse('a1'.repeat(36)).success).toBe(true);
  });

  it('accepts a valid password', () => {
    expect(passwordSchema.safeParse('Passw0rdok').success).toBe(true);
  });
});

describe('request schemas', () => {
  it('normalizes email casing and whitespace', () => {
    const parsed = loginSchema.parse({ email: '  User@Example.COM ', password: 'x' });
    expect(parsed.email).toBe('user@example.com');
  });

  it('validates signup input', () => {
    expect(signupSchema.safeParse({ name: 'A', email: 'a@b.co', password: 'Passw0rdok' }).success).toBe(false);
    expect(signupSchema.safeParse({ name: 'Asha', email: 'nope', password: 'Passw0rdok' }).success).toBe(false);
    expect(signupSchema.safeParse({ name: 'Asha', email: 'asha@b.co', password: 'Passw0rdok' }).success).toBe(true);
  });

  it('validates forgot and reset input', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'asha@b.co' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: 'short', password: 'Passw0rdok' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'x'.repeat(43), password: 'Passw0rdok' }).success).toBe(true);
  });
});
