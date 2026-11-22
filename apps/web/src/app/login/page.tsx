import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@veritas/ui';
import { LoginForm } from '@/components/LoginForm';
import { NextMuiLink } from '@/components/NextMuiLink';
import { safeNextPath } from '@/lib/navigation';
import { getCurrentUser } from '@/server/session';

export const metadata: Metadata = { title: 'Sign in' };

type SearchParams = Promise<{ next?: string | string[]; reset?: string | string[] }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { next, reset } = await searchParams;
  const nextPath = safeNextPath(next);

  if (await getCurrentUser()) {
    redirect(nextPath);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to Veritas"
      footer={
        <>
          Don&apos;t have an account? <NextMuiLink href="/signup">Sign up</NextMuiLink>
        </>
      }
    >
      <LoginForm next={nextPath} passwordReset={reset === '1'} />
    </AuthLayout>
  );
}
