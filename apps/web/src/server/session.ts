import { cookies } from 'next/headers';
import type { NextRequest, NextResponse } from 'next/server';
import {
  AppError,
  assertPermission,
  type AuthenticatedSession,
  type AuthUser,
} from '@veritas/auth';
import type { Permission } from '@veritas/schemas';
import { IS_PRODUCTION, SESSION_COOKIE } from '@/lib/session-cookie';
import { getContext } from './context';

export function attachSessionCookie(response: NextResponse, token: string, maxAgeSeconds: number): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function authenticateRequest(req: NextRequest): Promise<AuthenticatedSession | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  return getContext().auth.authenticate(token);
}

export async function requireSession(req: NextRequest): Promise<AuthenticatedSession> {
  const session = await authenticateRequest(req);
  if (!session) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
  return session;
}

export async function requirePermission(req: NextRequest, permission: Permission): Promise<AuthenticatedSession> {
  const session = await requireSession(req);
  assertPermission(session.user, permission);
  return session;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const session = await getContext().auth.authenticate(token);
  return session?.user ?? null;
}
