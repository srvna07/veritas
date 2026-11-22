import { hasRole, type Role } from '@veritas/schemas';

/** Pages reachable without being signed in. Signed-in users are bounced away from them. */
export const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'] as const;

/** Path prefixes that require a specific role. Everything else just requires sign-in. */
const ROLE_RULES: ReadonlyArray<{ prefix: string; roles: readonly Role[] }> = [
  { prefix: '/admin', roles: ['admin'] },
];

export type RouteDecision = 'allow' | 'login' | 'home' | 'forbidden';

function matchesPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function decideRoute(pathname: string, role: Role | null): RouteDecision {
  const isPublic = PUBLIC_PATHS.some((p) => matchesPath(pathname, p));
  if (isPublic) return role ? 'home' : 'allow';
  if (!role) return 'login';
  const rule = ROLE_RULES.find((r) => matchesPath(pathname, r.prefix));
  if (rule && !hasRole(role, rule.roles)) return 'forbidden';
  return 'allow';
}

function isSafeRelative(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\');
}

/**
 * Only allow same-site redirects; blocks open redirects via `callbackUrl`. Auth.js hands us an
 * absolute URL for the page the user came from, so an absolute URL on `origin` is reduced to its
 * path. Anything else falls back.
 */
export function safeRedirectPath(
  value: string | null | undefined,
  fallback = '/',
  origin?: string,
): string {
  if (!value) return fallback;
  if (isSafeRelative(value)) return value;
  if (origin) {
    try {
      const url = new URL(value);
      if (url.origin === origin) {
        const relative = `${url.pathname}${url.search}${url.hash}`;
        if (isSafeRelative(relative)) return relative;
      }
    } catch {
      // not a valid absolute URL
    }
  }
  return fallback;
}
