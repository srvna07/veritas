'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import { PasswordField } from '@veritas/ui';
import { ApiClientError, apiRequest, errorMessage } from '@/lib/api';
import { applyServerFieldErrors, fieldProps } from '@/lib/field';
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
  type ResetPasswordFormOutput,
} from '@/lib/forms';
import { NextMuiLink } from './NextMuiLink';

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormInput, unknown, ResetPasswordFormOutput>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ password }) => {
    setServerError(null);
    try {
      await apiRequest('/auth/reset-password', { body: { token, password } });
      router.replace('/login?reset=1');
    } catch (error) {
      if (error instanceof ApiClientError && error.code === 'INVALID_OR_EXPIRED_TOKEN') {
        setTokenInvalid(true);
        return;
      }
      if (applyServerFieldErrors(error, setError, ['password'])) {
        return;
      }
      setServerError(errorMessage(error));
    }
  });

  if (tokenInvalid) {
    return (
      <Alert severity="error">
        This reset link is invalid or has expired.{' '}
        <NextMuiLink href="/forgot-password">Request a new link</NextMuiLink>
      </Alert>
    );
  }

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Reset password">
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      <PasswordField
        label="New password"
        autoComplete="new-password"
        autoFocus
        {...fieldProps(register, errors, 'password')}
        helperText={errors.password?.message ?? 'At least 8 characters with a letter and a number'}
      />
      <PasswordField
        label="Confirm new password"
        autoComplete="new-password"
        {...fieldProps(register, errors, 'confirmPassword')}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {isSubmitting ? 'Updating password' : 'Update password'}
      </Button>
    </Stack>
  );
}
