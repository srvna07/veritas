import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from './config';
import { AppError } from './errors';
import { signSessionToken, verifySessionToken } from './jwt';
import { createLazyMailer, createMailerFromEnv, type Mailer } from './mailer';
import { createDummyHash, hashPassword, verifyPassword } from './password';
import { assertAuthenticated, assertPermission, assertRole, type AuthUser } from './rbac';
import { passwordChangedEmail, resetPasswordEmail } from './templates';
import { generateResetToken, hashToken } from './tokens';

const SECRET = 'unit-test-secret-unit-test-secret-1234';

const contributor: AuthUser = { id: '1', name: 'C', email: 'c@x.co', role: 'contributor' };
const admin: AuthUser = { id: '2', name: 'A', email: 'a@x.co', role: 'admin' };

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('Passw0rdok', 4);
    expect(hash).not.toBe('Passw0rdok');
    expect(await verifyPassword('Passw0rdok', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
    expect(await createDummyHash(4)).toMatch(/^\$2/);
  });
});

describe('tokens', () => {
  it('generates unique url-safe tokens and hashes deterministically', () => {
    const a = generateResetToken();
    const b = generateResetToken();
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toBe(a.token);
  });
});

describe('jwt', () => {
  it('round-trips claims', async () => {
    const token = await signSessionToken({ userId: 'u1', sessionId: 's1', role: 'admin' }, SECRET, 60);
    expect(await verifySessionToken(token, SECRET)).toEqual({ userId: 'u1', sessionId: 's1', role: 'admin' });
  });

  it('rejects wrong secret and expired tokens', async () => {
    const token = await signSessionToken({ userId: 'u1', sessionId: 's1', role: 'admin' }, SECRET, 60);
    expect(await verifySessionToken(token, 'different-secret-different-secret-12')).toBeNull();
    const expired = await signSessionToken({ userId: 'u1', sessionId: 's1', role: 'admin' }, SECRET, -10);
    expect(await verifySessionToken(expired, SECRET)).toBeNull();
  });
});

describe('rbac guards', () => {
  it('requires authentication', () => {
    expect(() => assertAuthenticated(null)).toThrowError(AppError);
    expect(() => assertAuthenticated(contributor)).not.toThrow();
  });

  it('enforces permissions', () => {
    expect(() => assertPermission(admin, 'users:read')).not.toThrow();
    expect(() => assertPermission(contributor, 'users:read')).toThrowError(/permission/);
  });

  it('enforces roles', () => {
    expect(() => assertRole(admin, 'admin')).not.toThrow();
    expect(() => assertRole(contributor, 'admin')).toThrowError(AppError);
  });
});

describe('config', () => {
  it('requires a strong JWT secret', () => {
    expect(() => loadAuthConfig({ JWT_SECRET: 'short' })).toThrowError(/JWT_SECRET/);
  });

  it('applies defaults and trims the trailing slash from APP_URL', () => {
    const config = loadAuthConfig({ JWT_SECRET: SECRET, APP_URL: 'https://veritas.example.com/' });
    expect(config.appUrl).toBe('https://veritas.example.com');
    expect(config.jwtExpiresInSeconds).toBe(604800);
    expect(config.bcryptCost).toBe(12);
  });
});

describe('mailer selection', () => {
  it('falls back to the console mailer without SMTP credentials', async () => {
    const mailer = createMailerFromEnv({ NODE_ENV: 'development' });
    expect(typeof mailer.send).toBe('function');
  });

  it('refuses to run in production without SMTP credentials', () => {
    expect(() => createMailerFromEnv({ NODE_ENV: 'production' })).toThrowError(/SMTP_USER/);
  });

  it('builds an SMTP mailer when credentials are present', () => {
    const mailer = createMailerFromEnv({ SMTP_USER: 'me@gmail.com', SMTP_PASS: 'app-password' });
    expect(typeof mailer.send).toBe('function');
  });
});

describe('lazy mailer', () => {
  const message = { to: 'a@b.co', subject: 's', text: 't', html: '<p>t</p>' };

  it('does not build the transport until the first send, then reuses it', async () => {
    let builds = 0;
    const sent: string[] = [];
    const mailer = createLazyMailer(() => {
      builds += 1;
      const inner: Mailer = {
        async send(m) {
          sent.push(m.to);
        },
      };
      return inner;
    });
    expect(builds).toBe(0);
    await mailer.send(message);
    await mailer.send(message);
    expect(builds).toBe(1);
    expect(sent).toEqual(['a@b.co', 'a@b.co']);
  });

  it('surfaces factory failures on send instead of at construction', async () => {
    const mailer = createLazyMailer(() => createMailerFromEnv({ NODE_ENV: 'production' }));
    await expect(mailer.send(message)).rejects.toThrowError(/SMTP_USER/);
  });
});

describe('email templates', () => {
  it('escapes user-controlled values in html', () => {
    const message = resetPasswordEmail({
      to: 'a@b.co',
      name: '<script>alert(1)</script>',
      resetUrl: 'http://localhost:3000/reset-password?token=abc',
      ttlMinutes: 30,
    });
    expect(message.html).not.toContain('<script>');
    expect(message.html).toContain('&lt;script&gt;');
    expect(message.text).toContain('http://localhost:3000/reset-password?token=abc');
  });

  it('builds the password changed notice', () => {
    const message = passwordChangedEmail({ to: 'a@b.co', name: 'Asha' });
    expect(message.subject).toBe('Your Veritas password was changed');
  });
});
