import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { NextRequest, type NextResponse } from 'next/server';
import { createAuthService, type AuthConfig, type MailMessage } from '@veritas/auth';
import { createTestDb } from '@veritas/db/testing';
import { setContextForTests, type AppContext } from '@/server/context';
import { createRateLimiter } from '@/server/rate-limit';
import { GET as healthGET } from './health/route';
import { POST as signupPOST } from './auth/signup/route';
import { POST as loginPOST } from './auth/login/route';
import { POST as logoutPOST } from './auth/logout/route';
import { GET as meGET } from './auth/me/route';
import { POST as forgotPOST } from './auth/forgot-password/route';
import { POST as resetPOST } from './auth/reset-password/route';
import { GET as usersGET } from './users/route';
import { PATCH as rolePATCH } from './users/[id]/role/route';
import { GET as fallbackGET, POST as fallbackPOST } from '../[...path]/route';

const ORIGIN = 'http://localhost:3000';
const COOKIE = 'veritas_session';
const PASSWORD = 'Passw0rdok';

const config: AuthConfig = {
  jwtSecret: 'integration-secret-integration-secret-12',
  jwtExpiresInSeconds: 3600,
  appUrl: ORIGIN,
  resetTokenTtlMinutes: 30,
  bcryptCost: 4,
};

type CallOptions = {
  method?: string;
  body?: unknown;
  rawBody?: string;
  cookie?: string | null;
  headers?: Record<string, string>;
};

function buildRequest(path: string, options: CallOptions = {}): NextRequest {
  const headers = new Headers(options.headers);
  if (options.body !== undefined || options.rawBody !== undefined) {
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }
  if (options.cookie) {
    headers.set('cookie', `${COOKIE}=${options.cookie}`);
  }
  const body = options.rawBody ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined);
  return new NextRequest(new URL(path, ORIGIN), { method: options.method ?? 'GET', headers, body });
}

async function read(response: NextResponse) {
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null, response };
}

function sessionCookie(response: NextResponse): string | undefined {
  return response.cookies.get(COOKIE)?.value;
}

describe('API v1', () => {
  let context: AppContext;
  let closeDb: () => Promise<void>;
  let mails: MailMessage[];
  let counter = 0;

  const nextEmail = () => `person${(counter += 1)}@example.com`;

  async function signup(overrides: Partial<{ name: string; email: string; password: string }> = {}) {
    const email = overrides.email ?? nextEmail();
    const result = await read(
      await signupPOST(
        buildRequest('/api/v1/auth/signup', {
          method: 'POST',
          body: { name: overrides.name ?? 'Asha Rao', email, password: overrides.password ?? PASSWORD },
        }),
        { params: Promise.resolve({}) },
      ),
    );
    return { ...result, email, cookie: sessionCookie(result.response) };
  }

  async function createAdminSession() {
    const email = nextEmail();
    await context.auth.ensureAdmin({ name: 'Admin Boss', email, password: PASSWORD });
    const result = await read(
      await loginPOST(buildRequest('/api/v1/auth/login', { method: 'POST', body: { email, password: PASSWORD } }), {
        params: Promise.resolve({}),
      }),
    );
    return { email, cookie: sessionCookie(result.response)!, userId: result.body.user.id as string };
  }

  const params = { params: Promise.resolve({}) };

  beforeAll(async () => {
    const handle = await createTestDb();
    closeDb = handle.close;
    mails = [];
    context = {
      auth: createAuthService({
        db: handle.db,
        mailer: {
          async send(message) {
            mails.push(message);
          },
        },
        config,
      }),
      config,
      limiter: createRateLimiter(),
    };
    setContextForTests(context);
  });

  afterAll(async () => {
    setContextForTests(undefined);
    await closeDb();
  });

  beforeEach(() => {
    context.limiter.reset();
    mails.length = 0;
  });

  describe('versioning', () => {
    it('serves health under /api/v1 and stamps the version header', async () => {
      const result = await read(await healthGET(buildRequest('/api/v1/health'), params));
      expect(result.status).toBe(200);
      expect(result.body).toEqual({ status: 'ok', version: 'v1' });
      expect(result.headers.get('x-api-version')).toBe('v1');
      expect(result.headers.get('cache-control')).toBe('no-store');
    });

    it('rejects unversioned paths with a hint', async () => {
      const result = await read(
        await fallbackPOST(buildRequest('/api/auth/login', { method: 'POST' }), {
          params: Promise.resolve({ path: ['auth', 'login'] }),
        }),
      );
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
      expect(result.body.error.message).toContain('/api/v1');
      expect(result.headers.get('x-api-version')).toBe('v1');
    });

    it('rejects unsupported versions explicitly', async () => {
      const result = await read(
        await fallbackGET(buildRequest('/api/v2/auth/me'), {
          params: Promise.resolve({ path: ['v2', 'auth', 'me'] }),
        }),
      );
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('UNSUPPORTED_API_VERSION');
    });

    it('returns not found for unknown v1 endpoints', async () => {
      const result = await read(
        await fallbackGET(buildRequest('/api/v1/nope'), { params: Promise.resolve({ path: ['v1', 'nope'] }) }),
      );
      expect(result.status).toBe(404);
      expect(result.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('signup', () => {
    it('creates a contributor and sets an httpOnly session cookie', async () => {
      const result = await signup();
      expect(result.status).toBe(201);
      expect(result.body.user.role).toBe('contributor');
      expect(result.body.user).not.toHaveProperty('passwordHash');
      expect(result.cookie).toBeTruthy();

      const setCookie = result.response.headers.get('set-cookie') ?? '';
      expect(setCookie.toLowerCase()).toContain('httponly');
      expect(setCookie.toLowerCase()).toContain('samesite=lax');
      expect(setCookie.toLowerCase()).toContain('path=/');
    });

    it('cannot self-assign a role', async () => {
      const email = nextEmail();
      const result = await read(
        await signupPOST(
          buildRequest('/api/v1/auth/signup', {
            method: 'POST',
            body: { name: 'Sneaky', email, password: PASSWORD, role: 'admin' },
          }),
          params,
        ),
      );
      expect(result.status).toBe(201);
      expect(result.body.user.role).toBe('contributor');
    });

    it('returns field errors for invalid input', async () => {
      const result = await signup({ name: 'A', email: 'not-an-email', password: 'short' });
      expect(result.status).toBe(422);
      expect(result.body.error.code).toBe('VALIDATION_ERROR');
      expect(Object.keys(result.body.error.details).sort()).toEqual(['email', 'name', 'password']);
    });

    it('rejects a duplicate email regardless of case', async () => {
      const first = await signup();
      const second = await signup({ email: first.email.toUpperCase() });
      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('requires a JSON content type and valid JSON', async () => {
      const wrongType = await read(
        await signupPOST(
          buildRequest('/api/v1/auth/signup', {
            method: 'POST',
            rawBody: 'name=x',
            headers: { 'content-type': 'text/plain' },
          }),
          params,
        ),
      );
      expect(wrongType.status).toBe(415);
      expect(wrongType.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');

      const malformed = await read(
        await signupPOST(buildRequest('/api/v1/auth/signup', { method: 'POST', rawBody: '{nope' }), params),
      );
      expect(malformed.status).toBe(400);
      expect(malformed.body.error.code).toBe('INVALID_JSON');
    });
  });

  describe('login, me, logout', () => {
    it('logs in and returns the current user from /me', async () => {
      const created = await signup();
      const login = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', {
            method: 'POST',
            body: { email: created.email.toUpperCase(), password: PASSWORD },
          }),
          params,
        ),
      );
      expect(login.status).toBe(200);
      const cookie = sessionCookie(login.response)!;

      const me = await read(await meGET(buildRequest('/api/v1/auth/me', { cookie }), params));
      expect(me.status).toBe(200);
      expect(me.body.user.email).toBe(created.email);
      expect(me.body.user.role).toBe('contributor');
    });

    it('gives an identical generic error for a wrong password and an unknown email', async () => {
      const created = await signup();
      const wrongPassword = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', { method: 'POST', body: { email: created.email, password: 'Wrong1234' } }),
          params,
        ),
      );
      const unknownEmail = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', {
            method: 'POST',
            body: { email: nextEmail(), password: PASSWORD },
          }),
          params,
        ),
      );
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(wrongPassword.body).toEqual(unknownEmail.body);
      expect(sessionCookie(wrongPassword.response)).toBeUndefined();
    });

    it('requires authentication for /me', async () => {
      const anonymous = await read(await meGET(buildRequest('/api/v1/auth/me'), params));
      expect(anonymous.status).toBe(401);
      expect(anonymous.body.error.code).toBe('UNAUTHENTICATED');

      const garbage = await read(await meGET(buildRequest('/api/v1/auth/me', { cookie: 'garbage' }), params));
      expect(garbage.status).toBe(401);
    });

    it('logout clears the cookie and revokes the session server-side', async () => {
      const created = await signup();
      const logout = await read(
        await logoutPOST(buildRequest('/api/v1/auth/logout', { method: 'POST', cookie: created.cookie }), params),
      );
      expect(logout.status).toBe(200);
      expect(logout.headers.get('set-cookie')?.toLowerCase()).toContain('max-age=0');

      const replay = await read(await meGET(buildRequest('/api/v1/auth/me', { cookie: created.cookie }), params));
      expect(replay.status).toBe(401);
    });

    it('logout is idempotent without a session', async () => {
      const result = await read(await logoutPOST(buildRequest('/api/v1/auth/logout', { method: 'POST' }), params));
      expect(result.status).toBe(200);
    });
  });

  describe('forgot and reset password', () => {
    it('responds identically for known and unknown emails', async () => {
      const created = await signup();
      const known = await read(
        await forgotPOST(
          buildRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email: created.email } }),
          params,
        ),
      );
      const unknown = await read(
        await forgotPOST(
          buildRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email: nextEmail() } }),
          params,
        ),
      );
      expect(known.status).toBe(200);
      expect(known.body).toEqual(unknown.body);
      expect(mails).toHaveLength(1);
      expect(mails[0]?.to).toBe(created.email);
    });

    it('completes the full reset flow and signs out existing sessions', async () => {
      const created = await signup();
      await forgotPOST(
        buildRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email: created.email } }),
        params,
      );
      const token = decodeURIComponent(/token=([^\s&]+)/.exec(mails[0]!.text)![1]!);

      const weak = await read(
        await resetPOST(
          buildRequest('/api/v1/auth/reset-password', { method: 'POST', body: { token, password: 'short' } }),
          params,
        ),
      );
      expect(weak.status).toBe(422);

      const reset = await read(
        await resetPOST(
          buildRequest('/api/v1/auth/reset-password', {
            method: 'POST',
            body: { token, password: 'BrandNew123' },
          }),
          params,
        ),
      );
      expect(reset.status).toBe(200);

      const oldSession = await read(await meGET(buildRequest('/api/v1/auth/me', { cookie: created.cookie }), params));
      expect(oldSession.status).toBe(401);

      const oldPassword = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', { method: 'POST', body: { email: created.email, password: PASSWORD } }),
          params,
        ),
      );
      expect(oldPassword.status).toBe(401);

      const newPassword = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', {
            method: 'POST',
            body: { email: created.email, password: 'BrandNew123' },
          }),
          params,
        ),
      );
      expect(newPassword.status).toBe(200);

      const reuse = await read(
        await resetPOST(
          buildRequest('/api/v1/auth/reset-password', {
            method: 'POST',
            body: { token, password: 'Another1234' },
          }),
          params,
        ),
      );
      expect(reuse.status).toBe(400);
      expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });

    it('rejects a made-up token', async () => {
      const result = await read(
        await resetPOST(
          buildRequest('/api/v1/auth/reset-password', {
            method: 'POST',
            body: { token: 'z'.repeat(43), password: 'BrandNew123' },
          }),
          params,
        ),
      );
      expect(result.status).toBe(400);
      expect(result.body.error.code).toBe('INVALID_OR_EXPIRED_TOKEN');
    });
  });

  describe('RBAC', () => {
    it('rejects anonymous and contributor access to the user list', async () => {
      const anonymous = await read(await usersGET(buildRequest('/api/v1/users'), params));
      expect(anonymous.status).toBe(401);

      const contributor = await signup();
      const forbidden = await read(await usersGET(buildRequest('/api/v1/users', { cookie: contributor.cookie }), params));
      expect(forbidden.status).toBe(403);
      expect(forbidden.body.error.code).toBe('FORBIDDEN');
    });

    it('lets an admin list users without exposing password hashes', async () => {
      await signup();
      const admin = await createAdminSession();
      const result = await read(await usersGET(buildRequest('/api/v1/users', { cookie: admin.cookie }), params));
      expect(result.status).toBe(200);
      expect(result.body.users.length).toBeGreaterThan(1);
      expect(JSON.stringify(result.body)).not.toContain('passwordHash');
    });

    it('blocks contributors from changing roles, including their own', async () => {
      const contributor = await signup();
      const result = await read(
        await rolePATCH(
          buildRequest(`/api/v1/users/${contributor.body.user.id}/role`, {
            method: 'PATCH',
            cookie: contributor.cookie,
            body: { role: 'admin' },
          }),
          { params: Promise.resolve({ id: contributor.body.user.id }) },
        ),
      );
      expect(result.status).toBe(403);
    });

    it('lets an admin promote a contributor, effective on their existing session immediately', async () => {
      const contributor = await signup();
      const admin = await createAdminSession();
      const id = contributor.body.user.id as string;

      const before = await read(await usersGET(buildRequest('/api/v1/users', { cookie: contributor.cookie }), params));
      expect(before.status).toBe(403);

      const promote = await read(
        await rolePATCH(
          buildRequest(`/api/v1/users/${id}/role`, { method: 'PATCH', cookie: admin.cookie, body: { role: 'admin' } }),
          { params: Promise.resolve({ id }) },
        ),
      );
      expect(promote.status).toBe(200);
      expect(promote.body.user.role).toBe('admin');

      const after = await read(await usersGET(buildRequest('/api/v1/users', { cookie: contributor.cookie }), params));
      expect(after.status).toBe(200);
    });

    it('validates the role and the user id', async () => {
      const admin = await createAdminSession();
      const contributor = await signup();
      const id = contributor.body.user.id as string;

      const badRole = await read(
        await rolePATCH(
          buildRequest(`/api/v1/users/${id}/role`, { method: 'PATCH', cookie: admin.cookie, body: { role: 'manager' } }),
          { params: Promise.resolve({ id }) },
        ),
      );
      expect(badRole.status).toBe(422);

      const badId = await read(
        await rolePATCH(
          buildRequest('/api/v1/users/not-a-uuid/role', { method: 'PATCH', cookie: admin.cookie, body: { role: 'admin' } }),
          { params: Promise.resolve({ id: 'not-a-uuid' }) },
        ),
      );
      expect(badId.status).toBe(404);

      const missingId = '00000000-0000-4000-8000-000000000000';
      const missing = await read(
        await rolePATCH(
          buildRequest(`/api/v1/users/${missingId}/role`, { method: 'PATCH', cookie: admin.cookie, body: { role: 'admin' } }),
          { params: Promise.resolve({ id: missingId }) },
        ),
      );
      expect(missing.status).toBe(404);
      expect(missing.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('request hardening', () => {
    it('rejects cross-origin state-changing requests', async () => {
      const crossOrigin = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', {
            method: 'POST',
            body: { email: 'a@b.co', password: PASSWORD },
            headers: { origin: 'https://evil.example.com' },
          }),
          params,
        ),
      );
      expect(crossOrigin.status).toBe(403);
      expect(crossOrigin.body.error.code).toBe('FORBIDDEN_ORIGIN');

      const fetchMetadata = await read(
        await logoutPOST(
          buildRequest('/api/v1/auth/logout', { method: 'POST', headers: { 'sec-fetch-site': 'cross-site' } }),
          params,
        ),
      );
      expect(fetchMetadata.status).toBe(403);
    });

    it('accepts same-origin requests', async () => {
      const result = await read(
        await logoutPOST(
          buildRequest('/api/v1/auth/logout', { method: 'POST', headers: { origin: ORIGIN } }),
          params,
        ),
      );
      expect(result.status).toBe(200);
    });

    it('rate limits repeated login attempts and sets Retry-After', async () => {
      const email = nextEmail();
      let last = await read(
        await loginPOST(
          buildRequest('/api/v1/auth/login', { method: 'POST', body: { email, password: 'Wrong1234' } }),
          params,
        ),
      );
      for (let attempt = 0; attempt < 10; attempt += 1) {
        last = await read(
          await loginPOST(
            buildRequest('/api/v1/auth/login', { method: 'POST', body: { email, password: 'Wrong1234' } }),
            params,
          ),
        );
      }
      expect(last.status).toBe(429);
      expect(last.body.error.code).toBe('RATE_LIMITED');
      expect(Number(last.headers.get('retry-after'))).toBeGreaterThan(0);
    });
  });
});
