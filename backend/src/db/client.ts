import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Db = PostgresJsDatabase<typeof schema>;

// Cache on globalThis so Next.js hot reloading does not open a new pool on every edit.
const globalForDb = globalThis as unknown as { __veritasDb?: Db };

export function getDb(): Db {
  if (!globalForDb.__veritasDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    globalForDb.__veritasDb = drizzle(postgres(url, { max: 10 }), { schema });
  }
  return globalForDb.__veritasDb;
}
