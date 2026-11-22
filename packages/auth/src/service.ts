import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { isUniqueViolation, passwordResetTokens, sessions, users, type Db, type UserRow } from '@veritas/db';
import {
  DEFAULT_ROLE,
  type ForgotPasswordInput,
  type LoginInput,
  type PublicUser,
  type ResetPasswordInput,
  type Role,
  type SignupInput,
} from '@veritas/schemas';
import type { AuthConfig } from './config';
import { AppError } from './errors';
import { signSessionToken, verifySessionToken } from './jwt';
import type { MailMessage, Mailer } from './mailer';
import { createDummyHash, hashPassword, verifyPassword } from './password';
import type { AuthUser } from './rbac';
import { passwordChangedEmail, resetPasswordEmail } from './templates';
import { generateResetToken, hashToken } from './tokens';

export type AuthServiceDeps = {
  db: Db;
  mailer: Mailer;
  config: AuthConfig;
  now?: () => Date;
  logger?: Pick<Console, 'error'>;
};

export type IssuedSession = {
  token: string;
  expiresInSeconds: number;
  user: PublicUser;
};

export type AuthenticatedSession = {
  user: AuthUser;
  sessionId: string;
};

function toAuthUser(row: UserRow): AuthUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

function toPublicUser(row: UserRow): PublicUser {
  return { ...toAuthUser(row), createdAt: row.createdAt.toISOString() };
}

export function createAuthService(deps: AuthServiceDeps) {
  const { db, mailer, config } = deps;
  const now = deps.now ?? (() => new Date());
  const logger = deps.logger ?? console;
  let dummyHash: Promise<string> | undefined;

  const getDummyHash = () => {
    dummyHash ??= createDummyHash(config.bcryptCost);
    return dummyHash;
  };

  const sendInBackground = (message: MailMessage) => {
    try {
      mailer.send(message).catch((error: unknown) => {
        logger.error('Failed to send email', { to: message.to, subject: message.subject, error });
      });
    } catch (error) {
      logger.error('Failed to send email', { to: message.to, subject: message.subject, error });
    }
  };

  const issueSession = async (user: UserRow): Promise<IssuedSession> => {
    const ttl = config.jwtExpiresInSeconds;
    const expiresAt = new Date(now().getTime() + ttl * 1000);
    const [session] = await db.insert(sessions).values({ userId: user.id, expiresAt }).returning();
    if (!session) {
      throw new Error('Failed to create session');
    }
    const token = await signSessionToken(
      { userId: user.id, sessionId: session.id, role: user.role },
      config.jwtSecret,
      ttl,
    );
    return { token, expiresInSeconds: ttl, user: toPublicUser(user) };
  };

  const insertUser = async (input: SignupInput, role: Role): Promise<UserRow> => {
    const passwordHash = await hashPassword(input.password, config.bcryptCost);
    try {
      const [row] = await db
        .insert(users)
        .values({ name: input.name, email: input.email, passwordHash, role })
        .returning();
      if (!row) {
        throw new Error('Failed to create user');
      }
      return row;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
  };

  return {
    async signup(input: SignupInput): Promise<IssuedSession> {
      const user = await insertUser(input, DEFAULT_ROLE);
      return issueSession(user);
    },

    async login(input: LoginInput): Promise<IssuedSession> {
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) {
        await verifyPassword(input.password, await getDummyHash());
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
      return issueSession(user);
    },

    async authenticate(token: string): Promise<AuthenticatedSession | null> {
      const claims = await verifySessionToken(token, config.jwtSecret);
      if (!claims) {
        return null;
      }
      const [row] = await db
        .select({ user: users, sessionId: sessions.id })
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.userId))
        .where(
          and(
            eq(sessions.id, claims.sessionId),
            eq(sessions.userId, claims.userId),
            isNull(sessions.revokedAt),
            gt(sessions.expiresAt, now()),
          ),
        )
        .limit(1);
      if (!row) {
        return null;
      }
      return { user: toAuthUser(row.user), sessionId: row.sessionId };
    },

    async logout(sessionId: string): Promise<void> {
      await db
        .update(sessions)
        .set({ revokedAt: now() })
        .where(and(eq(sessions.id, sessionId), isNull(sessions.revokedAt)));
    },

    async forgotPassword(input: ForgotPasswordInput): Promise<void> {
      const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!user) {
        return;
      }
      const { token, tokenHash } = generateResetToken();
      const expiresAt = new Date(now().getTime() + config.resetTokenTtlMinutes * 60_000);
      await db.transaction(async (tx) => {
        await tx
          .delete(passwordResetTokens)
          .where(and(eq(passwordResetTokens.userId, user.id), isNull(passwordResetTokens.usedAt)));
        await tx.insert(passwordResetTokens).values({ userId: user.id, tokenHash, expiresAt });
      });
      sendInBackground(
        resetPasswordEmail({
          to: user.email,
          name: user.name,
          resetUrl: `${config.appUrl}/reset-password?token=${encodeURIComponent(token)}`,
          ttlMinutes: config.resetTokenTtlMinutes,
        }),
      );
    },

    async resetPassword(input: ResetPasswordInput): Promise<void> {
      const tokenHash = hashToken(input.token);
      const invalid = () =>
        new AppError(400, 'INVALID_OR_EXPIRED_TOKEN', 'This reset link is invalid or has expired');

      const [existing] = await db
        .select({ id: passwordResetTokens.id })
        .from(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.tokenHash, tokenHash),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now()),
          ),
        )
        .limit(1);
      if (!existing) {
        throw invalid();
      }

      const passwordHash = await hashPassword(input.password, config.bcryptCost);
      const timestamp = now();

      const updated = await db.transaction(async (tx) => {
        const [claimed] = await tx
          .update(passwordResetTokens)
          .set({ usedAt: timestamp })
          .where(
            and(
              eq(passwordResetTokens.tokenHash, tokenHash),
              isNull(passwordResetTokens.usedAt),
              gt(passwordResetTokens.expiresAt, timestamp),
            ),
          )
          .returning({ userId: passwordResetTokens.userId });
        if (!claimed) {
          return null;
        }
        const [user] = await tx
          .update(users)
          .set({ passwordHash, updatedAt: timestamp })
          .where(eq(users.id, claimed.userId))
          .returning();
        await tx
          .update(passwordResetTokens)
          .set({ usedAt: timestamp })
          .where(and(eq(passwordResetTokens.userId, claimed.userId), isNull(passwordResetTokens.usedAt)));
        await tx
          .update(sessions)
          .set({ revokedAt: timestamp })
          .where(and(eq(sessions.userId, claimed.userId), isNull(sessions.revokedAt)));
        return user ?? null;
      });

      if (!updated) {
        throw invalid();
      }
      sendInBackground(passwordChangedEmail({ to: updated.email, name: updated.name }));
    },

    async listUsers(): Promise<PublicUser[]> {
      const rows = await db.select().from(users).orderBy(desc(users.createdAt));
      return rows.map(toPublicUser);
    },

    async setRole(userId: string, role: Role): Promise<PublicUser> {
      return db.transaction(async (tx) => {
        const [target] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
        if (!target) {
          throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }
        if (target.role === role) {
          return toPublicUser(target);
        }
        if (target.role === 'admin') {
          const admins = await tx.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).for('update');
          if (admins.length <= 1) {
            throw new AppError(409, 'LAST_ADMIN', 'At least one admin must remain');
          }
        }
        const [updated] = await tx
          .update(users)
          .set({ role, updatedAt: now() })
          .where(eq(users.id, userId))
          .returning();
        if (!updated) {
          throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
        }
        return toPublicUser(updated);
      });
    },

    async ensureAdmin(input: SignupInput): Promise<{ created: boolean; user: PublicUser }> {
      const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (existing) {
        if (existing.role === 'admin') {
          return { created: false, user: toPublicUser(existing) };
        }
        const [promoted] = await db
          .update(users)
          .set({ role: 'admin', updatedAt: now() })
          .where(eq(users.id, existing.id))
          .returning();
        return { created: false, user: toPublicUser(promoted ?? existing) };
      }
      const user = await insertUser(input, 'admin');
      return { created: true, user: toPublicUser(user) };
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
