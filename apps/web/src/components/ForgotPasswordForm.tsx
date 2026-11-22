'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { apiRequest, errorMessage } from '@/lib/api';
import { fieldProps } from '@/lib/field';
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormInput,
  type ForgotPasswordFormOutput,
} from '@/lib/forms';

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormInput, unknown, ForgotPasswordFormOutput>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiRequest('/auth/forgot-password', { body: values });
      setSentTo(values.email);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  if (sentTo) {
    return (
      <Alert severity="success" role="status">
        If an account exists for <strong>{sentTo}</strong>, we have sent a link to reset your password. The link
        expires in 30 minutes.
      </Alert>
    );
  }

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Forgot password">
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        {...fieldProps(register, errors, 'email')}
      />
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {isSubmitting ? 'Sending link' : 'Send reset link'}
      </Button>
    </Stack>
  );
}
