'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { PasswordField } from '@veritas/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { fieldProps } from '@/lib/field';
import { loginFormSchema, type LoginFormInput, type LoginFormOutput } from '@/lib/forms';
import { NextMuiLink } from './NextMuiLink';

type LoginFormProps = {
  next: string;
  passwordReset?: boolean;
};

export function LoginForm({ next, passwordReset = false }: LoginFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormInput, unknown, LoginFormOutput>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiRequest('/auth/login', { body: values });
      router.replace(next);
      router.refresh();
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Sign in">
      {passwordReset ? (
        <Alert severity="success">Your password was updated. Sign in with your new password.</Alert>
      ) : null}
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        autoFocus
        {...fieldProps(register, errors, 'email')}
      />
      <PasswordField
        label="Password"
        autoComplete="current-password"
        {...fieldProps(register, errors, 'password')}
      />
      <Box sx={{ textAlign: 'right', mt: -1 }}>
        <NextMuiLink href="/forgot-password" variant="body2">
          Forgot password?
        </NextMuiLink>
      </Box>
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {isSubmitting ? 'Signing in' : 'Sign in'}
      </Button>
    </Stack>
  );
}
