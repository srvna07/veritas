import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const migrationsFolder = fileURLToPath(new URL('../migrations', import.meta.url));
const client = postgres(connectionString, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder });
  console.log('Migrations applied');
} catch (error) {
  console.error('Migration failed', error);
  process.exitCode = 1;
} finally {
  await client.end({ timeout: 5 });
}
