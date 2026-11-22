import type { Metadata } from 'next';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { TextLink } from '@/components/NavLinks';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset password' };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <Stack spacing={2.5}>
        <Alert severity="error">This reset link is missing its token. Request a new one.</Alert>
        <TextLink href="/forgot-password" variant="body2" sx={{ textAlign: 'center' }}>
          Request a new link
        </TextLink>
      </Stack>
    );
  }

  return <ResetPasswordForm token={token} />;
}
