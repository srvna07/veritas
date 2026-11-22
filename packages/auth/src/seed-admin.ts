import { createDb } from '@veritas/db';
import { signupSchema } from '@veritas/schemas';
import { loadAuthConfig } from './config';
import { createConsoleMailer } from './mailer';
import { createAuthService } from './service';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const parsed = signupSchema.safeParse({
  name: process.env.ADMIN_NAME ?? 'Admin',
  email: process.env.ADMIN_EMAIL,
  password: process.env.ADMIN_PASSWORD,
});

if (!parsed.success) {
  console.error('Invalid ADMIN_NAME, ADMIN_EMAIL or ADMIN_PASSWORD');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

const { db, close } = createDb(databaseUrl, { max: 1 });

try {
  const service = createAuthService({
    db,
    mailer: createConsoleMailer(),
    config: loadAuthConfig({ ...process.env, JWT_SECRET: process.env.JWT_SECRET ?? 'x'.repeat(32) }),
  });
  const { created, user } = await service.ensureAdmin(parsed.data);
  console.log(created ? `Created admin ${user.email}` : `Ensured admin role for ${user.email}`);
} catch (error) {
  console.error('Seeding admin failed', error);
  process.exitCode = 1;
} finally {
  await close();
}
