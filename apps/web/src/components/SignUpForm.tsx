'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import MuiLink from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { signUpSchema, type SignUpInput } from '@veritas/schemas';
import { signUpAction } from '@/app/actions/auth';
import { FormShell } from './FormShell';

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const result = await signUpAction(values);
    if (!result.ok) {
      setError(result.error);
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        const message = messages?.[0];
        if (message) setFieldError(field as keyof SignUpInput, { message });
      }
      return;
    }
    router.replace('/');
    router.refresh();
  });

  return (
    <FormShell
      title="Create your account"
      subtitle="New accounts start as contributors"
      error={error}
      submitLabel="Sign up"
      submitting={isSubmitting}
      onSubmit={onSubmit}
      footer={
        <MuiLink component={Link} href="/login" variant="body2">
          Already have an account? Sign in
        </MuiLink>
      }
    >
      <TextField
        label="Name"
        autoComplete="name"
        autoFocus
        error={!!errors.name}
        helperText={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={!!errors.email}
        helperText={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        error={!!errors.password}
        helperText={
          errors.password?.message ?? 'At least 10 characters, with a letter and a number'
        }
        {...register('password')}
      />
      <TextField
        label="Confirm password"
        type="password"
        autoComplete="new-password"
        error={!!errors.confirmPassword}
        helperText={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
    </FormShell>
  );
}
