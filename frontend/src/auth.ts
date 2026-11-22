import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { findUserByEmail } from '@veritas/backend/db';
import { signInSchema } from '@veritas/schemas';
import { authConfig } from './auth.config';
import { signInLimiter, verifyAgainstDummy, verifyPassword } from '@veritas/backend/security';

class TooManyAttempts extends CredentialsSignin {
  code = 'too_many_attempts';
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        if (!signInLimiter.take(email)) throw new TooManyAttempts();

        const user = await findUserByEmail(email);
        // Same work whether or not the account exists, and the same generic failure.
        const ok = user
          ? await verifyPassword(password, user.passwordHash)
          : await verifyAgainstDummy(password);
        if (!user || !ok) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
});
