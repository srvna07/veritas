# backend

All server-side logic. It has no UI code; the frontend imports it.

```
src/db/        Drizzle schema, DB client, queries (users, password-reset tokens), migrate script
src/security/  scrypt password hashing, reset tokens, rate limiters
src/mail/      Gmail SMTP sender for password-reset emails
src/config/    validated environment variables
scripts/       seed-admin.ts creates the first admin
migrations/    generated SQL migrations
```

Commands (from the repo root): `pnpm db:generate`, `pnpm db:migrate`, `pnpm seed:admin`, `pnpm test`.
