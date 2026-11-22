/**
 * Creates (or resets) the first admin so someone can sign in and promote others.
 * Usage: set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (and optionally SEED_ADMIN_NAME) in
 * frontend/.env.local, then run `pnpm seed:admin` from the repo root.
 */
import { upsertAdmin } from '../src/db';
import { emailSchema, passwordSchema } from '@veritas/schemas';
import { hashPassword } from '../src/security';

async function main(): Promise<void> {
  const email = emailSchema.safeParse(process.env.SEED_ADMIN_EMAIL);
  const password = passwordSchema.safeParse(process.env.SEED_ADMIN_PASSWORD);

  if (!email.success || !password.success) {
    console.error(
      'Set a valid SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD (10+ chars, letter + number).',
    );
    process.exit(1);
  }

  const user = await upsertAdmin({
    email: email.data,
    name: process.env.SEED_ADMIN_NAME?.trim() || 'Admin',
    passwordHash: await hashPassword(password.data),
  });
  console.log(`Admin ready: ${user.email}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
