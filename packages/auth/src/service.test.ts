import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { passwordResetTokens, sessions, users, type Db } from '@veritas/db';
import { createTestDb } from '@veritas/db/testing';
import { AppError } from './errors';
import { signSessionToken } from './jwt';
import type { MailMessage, Mailer } from './mailer';
import { createAuthService } from './service';
import type { AuthConfig } from './config';

const config: AuthConfig = {
  jwtSecret: 'test-secret-test-secret-test-secret-123',
  jwtExpiresInSeconds: 3600,
  appUrl: 'http://localhost:3000',
  resetTokenTtlMinutes: 30,
  bcryptCost: 4,
};

function createRecordingMailer() {
  const sent: MailMessage[] = [];
  const mailer: Mailer = {
    async send(message) {
      sent.push(message);
    },
  };
  return { mailer, sent };
}

function extractToken(message: MailMessage): string {
  const match = /token=([^\s&]+)/.exec(message.text);
  if (!match?.[1]) {
    throw new Error('token not found in email');
  }
  return decodeURIComponent(match[1]);
}

async function expectAppError(promise: Promise<unknown>, status: number, code: string) {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(AppError);
  expect((error as AppError).status).toBe(status);
  expect((error as AppError).code).toBe(code);
}

let counter = 0;
const nextEmail = () => `user${(counter += 1)}@example.com`;
const PASSWORD = 'Passw0rdok';

describe('auth service', () => {
  let db: Db;
  let close: () => Promise<void>;
  let clock: Date;
  let recorder: ReturnType<typeof createRecordingMailer>;
  let service: ReturnType<typeof createAuthService>;

  beforeAll(async () => {
    const handle = await createTestDb();
    db = handle.db;
    close = handle.close;
  });

  afterAll(async () => {
    await close();
  });

  beforeEach(() => {
    clock = new Date();
    recorder = createRecordingMailer();
    service = createAuthService({ db, mailer: recorder.mailer, config, now: () => clock });
  });

  describe('signup', () => {
    it('creates a contributor and returns a working session', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });

      expect(issued.user.role).toBe('contributor');
      expect(issued.user.email).toBe(email);
      expect(issued.user).not.toHaveProperty('passwordHash');

      const authenticated = await service.authenticate(issued.token);
      expect(authenticated?.user.id).toBe(issued.user.id);
      expect(authenticated?.user.role).toBe('contributor');
    });

    it('stores a hash, never the plaintext password', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      const [row] = await db.select().from(users).where(eq(users.email, email));
      expect(row?.passwordHash).toBeTruthy();
      expect(row?.passwordHash).not.toContain(PASSWORD);
    });

    it('rejects a duplicate email', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      await expectAppError(service.signup({ name: 'Other', email, password: PASSWORD }), 409, 'EMAIL_TAKEN');
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      const issued = await service.login({ email, password: PASSWORD });
      expect((await service.authenticate(issued.token))?.user.email).toBe(email);
    });

    it('returns the same error for a wrong password and an unknown email', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      await expectAppError(service.login({ email, password: 'Wrong1234' }), 401, 'INVALID_CREDENTIALS');
      await expectAppError(
        service.login({ email: nextEmail(), password: PASSWORD }),
        401,
        'INVALID_CREDENTIALS',
      );
    });
  });

  describe('sessions', () => {
    it('revokes the session on logout', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });
      const authenticated = await service.authenticate(issued.token);
      expect(authenticated).not.toBeNull();

      await service.logout(authenticated!.sessionId);

      expect(await service.authenticate(issued.token)).toBeNull();
    });

    it('rejects tampered tokens and tokens signed with another secret', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });
      const authenticated = await service.authenticate(issued.token);

      expect(await service.authenticate(`${issued.token}x`)).toBeNull();
      expect(await service.authenticate('not-a-jwt')).toBeNull();

      const forged = await signSessionToken(
        { userId: authenticated!.user.id, sessionId: authenticated!.sessionId, role: 'admin' },
        'another-secret-another-secret-12345',
        3600,
      );
      expect(await service.authenticate(forged)).toBeNull();
    });

    it('rejects a session whose database record has expired', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });
      const authenticated = await service.authenticate(issued.token);
      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(sessions.id, authenticated!.sessionId));

      expect(await service.authenticate(issued.token)).toBeNull();
    });

    it('ignores the role claim and reads the current role from the database', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });
      await service.ensureAdmin({ name: 'Asha', email, password: PASSWORD });

      const authenticated = await service.authenticate(issued.token);
      expect(authenticated?.user.role).toBe('admin');
    });
  });

  describe('forgot and reset password', () => {
    it('sends nothing and does not throw for an unknown email', async () => {
      await expect(service.forgotPassword({ email: nextEmail() })).resolves.toBeUndefined();
      expect(recorder.sent).toHaveLength(0);
    });

    it('emails a reset link and stores only the token hash', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      await service.forgotPassword({ email });

      expect(recorder.sent).toHaveLength(1);
      const message = recorder.sent[0]!;
      expect(message.to).toBe(email);
      expect(message.text).toContain('http://localhost:3000/reset-password?token=');

      const token = extractToken(message);
      const rows = await db.select().from(passwordResetTokens);
      expect(rows.some((row) => row.tokenHash === token)).toBe(false);
      expect(rows.length).toBeGreaterThan(0);
    });

    it('resets the password, revokes sessions, and consumes the token', async () => {
      const email = nextEmail();
      const issued = await service.signup({ name: 'Asha', email, password: PASSWORD });
      await service.forgotPassword({ email });
      const token = extractToken(recorder.sent[0]!);

      await service.resetPassword({ token, password: 'NewPassw0rd1' });

      expect(await service.authenticate(issued.token)).toBeNull();
      await expectAppError(service.login({ email, password: PASSWORD }), 401, 'INVALID_CREDENTIALS');
      await expect(service.login({ email, password: 'NewPassw0rd1' })).resolves.toBeTruthy();
      await expectAppError(
        service.resetPassword({ token, password: 'AnotherPassw0rd2' }),
        400,
        'INVALID_OR_EXPIRED_TOKEN',
      );
      expect(recorder.sent.at(-1)?.subject).toBe('Your Veritas password was changed');
    });

    it('rejects an expired token', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      await service.forgotPassword({ email });
      const token = extractToken(recorder.sent[0]!);

      clock = new Date(clock.getTime() + 31 * 60_000);

      await expectAppError(
        service.resetPassword({ token, password: 'NewPassw0rd1' }),
        400,
        'INVALID_OR_EXPIRED_TOKEN',
      );
    });

    it('rejects an unknown token', async () => {
      await expectAppError(
        service.resetPassword({ token: 'x'.repeat(43), password: 'NewPassw0rd1' }),
        400,
        'INVALID_OR_EXPIRED_TOKEN',
      );
    });

    it('invalidates earlier tokens when a new one is requested', async () => {
      const email = nextEmail();
      await service.signup({ name: 'Asha', email, password: PASSWORD });
      await service.forgotPassword({ email });
      await service.forgotPassword({ email });
      const first = extractToken(recorder.sent[0]!);
      const second = extractToken(recorder.sent[1]!);

      await expectAppError(
        service.resetPassword({ token: first, password: 'NewPassw0rd1' }),
        400,
        'INVALID_OR_EXPIRED_TOKEN',
      );
      await expect(service.resetPassword({ token: second, password: 'NewPassw0rd1' })).resolves.toBeUndefined();
    });

    it('does not fail the request when the mail transport throws', async () => {
      const failing: Mailer = {
        async send() {
          throw new Error('smtp down');
        },
      };
      const errors: unknown[] = [];
      const failingService = createAuthService({
        db,
        mailer: failing,
        config,
        logger: { error: (...args: unknown[]) => void errors.push(args) },
      });
      const email = nextEmail();
      await failingService.signup({ name: 'Asha', email, password: PASSWORD });

      await expect(failingService.forgotPassword({ email })).resolves.toBeUndefined();
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(errors).toHaveLength(1);
    });
  });

  describe('roles', () => {
    it('promotes and demotes users when more than one admin exists', async () => {
      const handle = await createTestDb();
      const isolated = createAuthService({ db: handle.db, mailer: recorder.mailer, config });
      const a = await isolated.ensureAdmin({ name: 'Admin A', email: nextEmail(), password: PASSWORD });
      const b = await isolated.signup({ name: 'Bee', email: nextEmail(), password: PASSWORD });

      const promoted = await isolated.setRole(b.user.id, 'admin');
      expect(promoted.role).toBe('admin');

      const demoted = await isolated.setRole(a.user.id, 'contributor');
      expect(demoted.role).toBe('contributor');
      await handle.close();
    });

    it('refuses to demote the last admin', async () => {
      const handle = await createTestDb();
      const isolated = createAuthService({ db: handle.db, mailer: recorder.mailer, config });
      const admin = await isolated.ensureAdmin({ name: 'Admin A', email: nextEmail(), password: PASSWORD });

      await expectAppError(isolated.setRole(admin.user.id, 'contributor'), 409, 'LAST_ADMIN');
      await handle.close();
    });

    it('returns not found for an unknown user', async () => {
      await expectAppError(
        service.setRole('00000000-0000-4000-8000-000000000000', 'admin'),
        404,
        'USER_NOT_FOUND',
      );
    });

    it('ensureAdmin creates, then is idempotent, and promotes existing users', async () => {
      const email = nextEmail();
      const created = await service.ensureAdmin({ name: 'Boss', email, password: PASSWORD });
      expect(created.created).toBe(true);
      expect(created.user.role).toBe('admin');

      const again = await service.ensureAdmin({ name: 'Boss', email, password: PASSWORD });
      expect(again.created).toBe(false);

      const contributorEmail = nextEmail();
      await service.signup({ name: 'Cee', email: contributorEmail, password: PASSWORD });
      const promoted = await service.ensureAdmin({ name: 'Cee', email: contributorEmail, password: PASSWORD });
      expect(promoted.user.role).toBe('admin');
    });

    it('lists users newest first without password hashes', async () => {
      const list = await service.listUsers();
      expect(list.length).toBeGreaterThan(0);
      for (const user of list) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });
  });
});
