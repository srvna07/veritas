import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
export { schema };

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

export type DbHandle = {
  db: Db;
  close: () => Promise<void>;
};

export function createDb(connectionString: string, options: { max?: number } = {}): DbHandle {
  const client = postgres(connectionString, { max: options.max ?? 10 });
  const db = drizzle(client, { schema });
  return {
    db,
    close: () => client.end({ timeout: 5 }),
  };
}

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current; depth += 1) {
    if (typeof current === 'object' && (current as { code?: unknown }).code === '23505') {
      return true;
    }
    current = (current as { cause?: unknown }).cause;
  }
  return false;
}
