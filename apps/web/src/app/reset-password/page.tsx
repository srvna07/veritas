import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import { AuthLayout } from '@veritas/ui';
import { NextMuiLink } from '@/components/NextMuiLink';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ token?: string | string[] }>;

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const { token } = await searchParams;
  const value = Array.isArray(token) ? token[0] : token;

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Pick a strong password you have not used before"
      footer={<NextMuiLink href="/login">Back to sign in</NextMuiLink>}
    >
      {value ? (
        <ResetPasswordForm token={value} />
      ) : (
        <Alert severity="error">
          This reset link is missing its token. <NextMuiLink href="/forgot-password">Request a new link</NextMuiLink>
        </Alert>
      )}
    </AuthLayout>
  );
}
