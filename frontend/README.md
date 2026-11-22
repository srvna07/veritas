# frontend

The Next.js (App Router) app: what users see and click.

```
src/app/(auth)/     login, signup, forgot-password, reset-password pages
src/app/(app)/      signed-in pages: dashboard, /admin/users (admin only), /forbidden
src/app/actions/    server actions: the frontend's only doorway into the backend
src/components/     forms and UI pieces (React Hook Form + Zod, MUI)
src/theme/          MUI theme + ThemeRegistry (light/dark, status colors)
src/auth.ts         Auth.js setup (JWT sessions, credentials login)
src/auth.config.ts  edge-safe Auth.js config used by the proxy
src/proxy.ts        redirects by route and role (pages also re-check on the server)
src/lib/            session helpers (requireUser / requireRole), small utilities
```

Run with `pnpm dev` from the repo root. Config goes in `frontend/.env.local`.
