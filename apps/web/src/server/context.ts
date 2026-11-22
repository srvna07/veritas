import { createDb } from '@veritas/db';
import {
  createAuthService,
  createLazyMailer,
  createMailerFromEnv,
  loadAuthConfig,
  type AuthConfig,
  type AuthService,
} from '@veritas/auth';
import { createRateLimiter, type RateLimiter } from './rate-limit';

export type AppContext = {
  auth: AuthService;
  config: AuthConfig;
  limiter: RateLimiter;
};

const globalStore = globalThis as unknown as { __veritasContext?: AppContext };

function createContext(): AppContext {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  const config = loadAuthConfig();
  const { db } = createDb(databaseUrl);
  const mailer = createLazyMailer(() => createMailerFromEnv());
  return {
    auth: createAuthService({ db, mailer, config }),
    config,
    limiter: createRateLimiter(),
  };
}

export function getContext(): AppContext {
  globalStore.__veritasContext ??= createContext();
  return globalStore.__veritasContext;
}

export function setContextForTests(context: AppContext | undefined): void {
  globalStore.__veritasContext = context;
}
