'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import MuiLink from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@veritas/schemas';
import { forgotPasswordAction } from '@/app/actions/auth';
import { FormShell } from './FormShell';

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await forgotPasswordAction(values);
    if (!result.ok) setError(result.error);
    else setSent(true);
  });

  if (sent) {
    return (
      <Stack spacing={2.5}>
        <Typography variant="h6" component="h1">
          Check your email
        </Typography>
        <Alert severity="success">
          If an account exists for that address, we have sent a link to reset your password. It
          expires in 1 hour.
        </Alert>
        <MuiLink component={Link} href="/login" variant="body2" sx={{ textAlign: 'center' }}>
          Back to sign in
        </MuiLink>
      </Stack>
    );
  }

  return (
    <FormShell
      title="Forgot your password?"
      subtitle="Enter your email and we will send you a reset link"
      error={error}
      submitLabel="Send reset link"
      submitting={isSubmitting}
      onSubmit={onSubmit}
      footer={
        <MuiLink component={Link} href="/login" variant="body2">
          Back to sign in
        </MuiLink>
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
    </FormShell>
  );
}
