# Veritas

AI-powered QA agent with a web UI. Give it a requirement and it will design scenarios and test cases, generate Playwright scripts, run them, and report results, with full requirement traceability.

This repository is a pnpm + Turborepo monorepo. The first milestone is authentication: login, signup, forgot/reset password, logout, JWT sessions, and role-based access control behind a versioned API.

## Stack

- Next.js 16 (App Router), React 19, TypeScript
- MUI 9 for the UI
- PostgreSQL with Drizzle ORM
- JWT (HS256, `jose`), bcrypt password hashing, Nodemailer (Gmail SMTP)
- Zod for validation, shared between client and server
- Vitest and Testing Library

## Layout

```
apps/
  web/            Next.js UI and /api/v1 route handlers
packages/
  schemas/        Zod schemas, roles, permissions, API error codes
  db/             Drizzle schema, migrations, drivers
  auth/           Password hashing, JWT, mailer, auth service, RBAC guards
  ui/             MUI theme and shared components
```

## Getting started

Requirements: Node 22+, pnpm 10, Docker (for local Postgres).

```bash
pnpm install
docker compose up -d
cp apps/web/.env.example apps/web/.env.local
pnpm db:migrate
pnpm db:seed-admin
pnpm dev
```

Open http://localhost:3000.

### Environment

All variables live in `apps/web/.env.local`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `APP_URL` | Public base URL, used in reset links and the origin check |
| `JWT_SECRET` | At least 32 random characters |
| `JWT_EXPIRES_IN_SECONDS` | Session lifetime, default 604800 (7 days) |
| `SMTP_HOST`, `SMTP_PORT` | Default `smtp.gmail.com` and `465` |
| `SMTP_USER`, `SMTP_PASS` | Gmail address and a Gmail app password |
| `MAIL_FROM` | Sender, for example `"Veritas <you@gmail.com>"` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used by `pnpm db:seed-admin` |

Generate a secret with `openssl rand -base64 48`.

### Gmail SMTP

Create an app password at https://myaccount.google.com/apppasswords (2-Step Verification must be on), then set `SMTP_USER` to your address and `SMTP_PASS` to the 16 character password.

Without SMTP credentials, development builds print emails to the server console so the reset flow still works locally. Production builds never do this, because it would write reset links to logs; if SMTP is not configured there, sending fails and the error is logged while the rest of the app keeps working.

## Roles

| Role | Meaning | Permissions |
|---|---|---|
| `contributor` | Employee | Sign in, view own profile |
| `admin` | Manager | Everything a contributor can do, plus list users and change roles |

Public signup always creates a `contributor`; a role in the request body is ignored. The first admin is created with `pnpm db:seed-admin`, which is idempotent and also promotes an existing user with that email. Admins can then promote others through the API. The last remaining admin cannot be demoted.

The role used for authorization is read from the database on every request, so promotions and demotions take effect immediately on existing sessions.

## API v1

Base path: `/api/v1`. Every response carries `X-API-Version: v1` and `Cache-Control: no-store`. Unversioned paths such as `/api/auth/login` return 404, and an unknown version such as `/api/v2/...` returns `UNSUPPORTED_API_VERSION`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness and version |
| POST | `/auth/signup` | Public | Create a contributor and sign in (201) |
| POST | `/auth/login` | Public | Sign in |
| POST | `/auth/logout` | Public | Revoke the session and clear the cookie |
| GET | `/auth/me` | Authenticated | Current user |
| POST | `/auth/forgot-password` | Public | Email a reset link; always responds identically |
| POST | `/auth/reset-password` | Public | Set a new password with a reset token |
| GET | `/users` | `users:read` (admin) | List users |
| PATCH | `/users/:id/role` | `users:manage_roles` (admin) | Change a user's role |

Errors share one shape:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request contains invalid data", "details": { "email": ["Enter a valid email address"] } } }
```

| Status | Codes |
|---|---|
| 400 | `INVALID_JSON`, `INVALID_OR_EXPIRED_TOKEN` |
| 401 | `INVALID_CREDENTIALS`, `UNAUTHENTICATED` |
| 403 | `FORBIDDEN`, `FORBIDDEN_ORIGIN` |
| 404 | `NOT_FOUND`, `USER_NOT_FOUND`, `UNSUPPORTED_API_VERSION` |
| 409 | `EMAIL_TAKEN`, `LAST_ADMIN` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 422 | `VALIDATION_ERROR` |
| 429 | `RATE_LIMITED` (with `Retry-After`) |

## Security notes

- Sessions are JWTs in an `httpOnly`, `SameSite=Lax` cookie (`__Host-` prefixed and `Secure` in production). Each token references a row in `sessions`, so logout and password reset revoke sessions server-side rather than just deleting the cookie.
- Passwords are hashed with bcrypt (cost 12), limited to 8 to 72 bytes (bcrypt's input limit) and must contain a letter and a number.
- Login returns the same error for an unknown email and a wrong password, and spends comparable time on both.
- Reset tokens are 256-bit random values, stored only as SHA-256 hashes, valid for 30 minutes, single use, and replaced when a new one is requested. Resetting a password signs out every session and sends a confirmation email.
- State-changing requests are rejected when `Origin` or `Sec-Fetch-Site` indicates a cross-site caller, and bodies must be `application/json`.
- Login, signup, forgot, and reset endpoints are rate limited. The limiter is in memory and per process, and it keys on `X-Forwarded-For`, so run behind a proxy you control and move it to a shared store (for example Redis) before scaling beyond one instance.
- `/dashboard` is guarded twice: a proxy redirect when no cookie is present, and a server-side session check on the page itself.
- The `?next=` redirect after login only accepts same-site paths.

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start the web app |
| `pnpm build` | Build everything |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript across all packages |
| `pnpm test` | Unit, API integration, and component tests |
| `pnpm db:generate` | Generate a migration after editing `packages/db/src/schema.ts` |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed-admin` | Create or promote the admin from `ADMIN_*` variables |

API integration tests run the real route handlers against an in-process PGlite database that applies the actual migrations, so no Docker is needed to run the test suite.
