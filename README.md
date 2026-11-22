# Veritas

AI-powered QA agent with a web UI. Requirement in, scenarios, test cases and Playwright tests out, with every artifact traceable back to the requirement.

This branch adds **authentication and role-based access control** (the first piece of the web app).

## Auth overview

| Feature                 | How                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| Login / sign-out        | Auth.js (Credentials provider), stateless **JWT** session (8h)                                       |
| Sign-up                 | Self-service; every new account is a **contributor**. The role is never accepted from the client     |
| Forgot / reset password | Single-use token, 1h expiry, only its SHA-256 is stored. Email via **Gmail SMTP** (nodemailer)       |
| Roles                   | `admin` (managers: everything + user management) and `contributor` (employees: use the product)      |
| Enforcement             | Proxy redirects by route **and** every page/server action re-checks the role on the server           |
| Passwords               | scrypt (N=2^16, r=8, p=2) with per-user salt, timing-safe compare, dummy hash for unknown emails     |
| Abuse protection        | In-memory rate limits on sign-in, sign-up, forgot and reset (use Redis if you run several instances) |

## Run it locally

Requirements: Node 22+, pnpm 10, Docker (for Postgres).

```bash
pnpm install
docker compose up -d                     # Postgres on :5432
cp .env.example frontend/.env.local      # then fill in AUTH_SECRET and the SEED_ADMIN_* values
pnpm db:migrate                          # create tables
pnpm seed:admin                          # create the first admin (SEED_ADMIN_EMAIL / PASSWORD)
pnpm dev                                 # http://localhost:3000
```

Generate `AUTH_SECRET` with `openssl rand -base64 32`.

### Gmail SMTP

1. Turn on 2-Step Verification for the Google account.
2. Create an **App Password** (Google Account > Security > App passwords).
3. In `frontend/.env.local` set `SMTP_USER` (your Gmail address), `SMTP_PASS` (the app password) and `MAIL_FROM`.

If `SMTP_USER`/`SMTP_PASS` are empty, then in development the reset link is printed in the server console instead of being emailed. In production the app refuses to start sending without them.

### Roles in practice

- Anyone can sign up and becomes a contributor.
- Sign in as the seeded admin, open **Users**, and promote managers to admin.
- The last remaining admin cannot be demoted.
- Role changes take effect the next time that person signs in (the role lives in the JWT).

## Scripts

`pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm build` · `pnpm format`

## Layout

```
frontend/         Everything the user sees: Next.js pages, components, MUI theme, server actions, route proxy
backend/          Everything server-side: database, security (passwords/tokens/rate limits), email, env
packages/schemas  Shared by both: Zod schemas, roles/permissions, route-access rules
packages/config   Shared tsconfig presets
```

The frontend calls the backend through its server actions (`frontend/src/app/actions`). Same Next.js
server, no separate API process. The backend is imported as `@veritas/backend/db`, `/security`, `/mail`, `/env`.
