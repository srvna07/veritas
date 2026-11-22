'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import MuiLink from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { resetPasswordSchema, type ResetPasswordInput } from '@veritas/schemas';
import { resetPasswordAction } from '@/app/actions/auth';
import { FormShell } from './FormShell';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token },
  });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await resetPasswordAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace('/login?reset=1');
  });

  return (
    <FormShell
      title="Choose a new password"
      error={error}
      submitLabel="Update password"
      submitting={isSubmitting}
      onSubmit={onSubmit}
      footer={
        <MuiLink component={Link} href="/forgot-password" variant="body2">
          Need a new link?
        </MuiLink>
      }
    >
      <input type="hidden" {...register('token')} />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        autoFocus
        error={!!errors.password}
        helperText={
          errors.password?.message ?? 'At least 10 characters, with a letter and a number'
        }
        {...register('password')}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </FormShell>
  );
}
