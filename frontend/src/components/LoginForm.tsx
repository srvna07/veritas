'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import MuiLink from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { safeRedirectPath, signInSchema, type SignInInput } from '@veritas/schemas';
import { signInAction } from '@/app/actions/auth';
import { FormShell } from './FormShell';

export function LoginForm({
  callbackUrl,
  resetDone,
}: {
  callbackUrl?: string;
  resetDone: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await signInAction(values);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.replace(safeRedirectPath(callbackUrl, '/', window.location.origin));
    router.refresh();
  });

  return (
    <FormShell
      title="Sign in"
      subtitle="Welcome back"
      info={resetDone ? 'Password updated. Sign in with your new password.' : null}
      error={error}
      submitLabel="Sign in"
      submitting={isSubmitting}
      onSubmit={onSubmit}
      footer={
        <>
          <MuiLink component={Link} href="/forgot-password" variant="body2">
            Forgot password?
          </MuiLink>
          <MuiLink component={Link} href="/signup" variant="body2">
            Create an account
          </MuiLink>
        </>
      }
    >
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        error={!!errors.password}
        helperText={errors.password?.message}
        {...register('password')}
      />
    </FormShell>
  );
}
