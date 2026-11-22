import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

// First line of defence: redirects by route. Server components and actions re-check the
// session and role themselves (see lib/session.ts), so the proxy is never the only guard.
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
