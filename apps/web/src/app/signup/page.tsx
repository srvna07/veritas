import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthLayout } from '@veritas/ui';
import { NextMuiLink } from '@/components/NextMuiLink';
import { SignupForm } from '@/components/SignupForm';
import { getCurrentUser } from '@/server/session';

export const metadata: Metadata = { title: 'Create account' };

export default async function SignupPage() {
  if (await getCurrentUser()) {
    redirect('/dashboard');
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join your team on Veritas"
      footer={
        <>
          Already have an account? <NextMuiLink href="/login">Sign in</NextMuiLink>
        </>
      }
    >
      <SignupForm />
    </AuthLayout>
  );
}
