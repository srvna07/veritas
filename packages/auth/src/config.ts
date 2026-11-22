import { z } from 'zod';

export type AuthConfig = {
  jwtSecret: string;
  jwtExpiresInSeconds: number;
  appUrl: string;
  resetTokenTtlMinutes: number;
  bcryptCost: number;
};

const envSchema = z.object({
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).max(60 * 60 * 24 * 90).default(60 * 60 * 24 * 7),
  APP_URL: z.url().default('http://localhost:3000'),
});

export function loadAuthConfig(env: Record<string, string | undefined> = process.env): AuthConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid auth configuration: ${issues.join('; ')}`);
  }
  return {
    jwtSecret: parsed.data.JWT_SECRET,
    jwtExpiresInSeconds: parsed.data.JWT_EXPIRES_IN_SECONDS,
    appUrl: parsed.data.APP_URL.replace(/\/+$/, ''),
    resetTokenTtlMinutes: 30,
    bcryptCost: 12,
  };
}
