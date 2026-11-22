'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import { consumeResetToken, createResetToken, createUser, findUserByEmail } from '@veritas/db';
import {
  DEFAULT_ROLE,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from '@veritas/schemas';
import { signIn, signOut } from '@/auth';
import { getServerEnv } from '@/env';
import { fail, type ActionResult } from '@/lib/action-result';
import { getClientIp } from '@/lib/client-ip';
import { sendPasswordResetEmail } from '@/lib/mailer';
import { hashPassword } from '@/lib/password';
import { forgotPasswordLimiter, resetPasswordLimiter, signUpLimiter } from '@/lib/rate-limit';
import { RESET_TOKEN_TTL_MS, generateResetToken, hashToken } from '@/lib/tokens';

const GENERIC_SIGN_IN_ERROR = 'Invalid email or password';
const TOO_MANY = 'Too many attempts. Please try again later.';

function fieldErrorsOf(error: z.ZodError) {
  return z.flattenError(error).fieldErrors;
}

export async function signInAction(input: unknown): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return fail(GENERIC_SIGN_IN_ERROR);

  try {
    await signIn('credentials', { ...parsed.data, redirect: false });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      if ('code' in error && error.code === 'too_many_attempts') return fail(TOO_MANY);
      return fail(GENERIC_SIGN_IN_ERROR);
    }
    throw error;
  }
}

export async function signUpAction(input: unknown): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success)
    return fail('Please fix the highlighted fields', fieldErrorsOf(parsed.error));

  if (!signUpLimiter.take(await getClientIp())) return fail(TOO_MANY);

  const { name, email, password } = parsed.data;
  // The role is never read from the request: everyone who signs up is a contributor.
  const user = await createUser({
    name,
    email,
    passwordHash: await hashPassword(password),
    role: DEFAULT_ROLE,
  });
  if (!user)
    return fail('An account with this email already exists', { email: ['Already registered'] });

  try {
    await signIn('credentials', { email, password, redirect: false });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    redirect('/login');
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}

/** Always reports success so the response never reveals whether an email is registered. */
export async function forgotPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail('Enter a valid email address', fieldErrorsOf(parsed.error));

  const { email } = parsed.data;
  if (!forgotPasswordLimiter.take(`${await getClientIp()}:${email}`)) return fail(TOO_MANY);

  // Do the lookup + email after responding so response time does not leak account existence.
  after(async () => {
    try {
      const user = await findUserByEmail(email);
      if (!user) return;
      const { token, tokenHash } = generateResetToken();
      await createResetToken({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      });
      const resetUrl = new URL('/reset-password', getServerEnv().APP_URL);
      resetUrl.searchParams.set('token', token);
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: resetUrl.toString(),
      });
    } catch (error) {
      console.error('[forgot-password] failed to send reset email', error);
    }
  });

  return { ok: true };
}

export async function resetPasswordAction(input: unknown): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success)
    return fail('Please fix the highlighted fields', fieldErrorsOf(parsed.error));

  if (!resetPasswordLimiter.take(await getClientIp())) return fail(TOO_MANY);

  const { token, password } = parsed.data;
  const userId = await consumeResetToken(hashToken(token), await hashPassword(password));
  if (!userId) return fail('This reset link is invalid or has expired. Request a new one.');

  return { ok: true };
}
