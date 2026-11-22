import type { Metadata } from 'next';
import { AuthLayout } from '@veritas/ui';
import { ForgotPasswordForm } from '@/components/ForgotPasswordForm';
import { NextMuiLink } from '@/components/NextMuiLink';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a reset link"
      footer={<NextMuiLink href="/login">Back to sign in</NextMuiLink>}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
