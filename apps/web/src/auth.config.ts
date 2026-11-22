import type { NextAuthConfig } from 'next-auth';
import { roleSchema } from '@veritas/schemas';
import { decideRoute } from '@/lib/access';

/** Edge-safe config (no DB / Node-only imports) shared by the proxy and the full auth setup. */
export const authConfig = {
  pages: { signIn: '/login' },
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8h; role changes apply at next sign-in
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const role = roleSchema.safeParse(auth?.user?.role);
      const decision = decideRoute(nextUrl.pathname, role.success ? role.data : null);
      switch (decision) {
        case 'allow':
          return true;
        case 'login':
          return false; // Auth.js redirects to pages.signIn with a callbackUrl
        case 'home':
          return Response.redirect(new URL('/', nextUrl));
        case 'forbidden':
          return Response.redirect(new URL('/forbidden', nextUrl));
      }
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.sub ?? '';
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      const role = roleSchema.safeParse(token.role);
      // Never expose a session without a valid role; consumers treat this as signed out.
      if (typeof token.id === 'string' && role.success) {
        session.user.id = token.id;
        session.user.role = role.data;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
