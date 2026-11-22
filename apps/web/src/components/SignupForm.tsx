'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { PasswordField } from '@veritas/ui';
import { apiRequest, errorMessage } from '@/lib/api';
import { applyServerFieldErrors, fieldProps } from '@/lib/field';
import { signupFormSchema, type SignupFormInput, type SignupFormOutput } from '@/lib/forms';

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormInput, unknown, SignupFormOutput>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setServerError(null);
    try {
      await apiRequest('/auth/signup', { body: { name, email, password } });
      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      if (applyServerFieldErrors(error, setError, ['name', 'email', 'password'])) {
        return;
      }
      setServerError(errorMessage(error));
    }
  });

  return (
    <Stack component="form" spacing={2.5} noValidate onSubmit={onSubmit} aria-label="Create account">
      {serverError ? <Alert severity="error">{serverError}</Alert> : null}
      <TextField label="Full name" autoComplete="name" autoFocus {...fieldProps(register, errors, 'name')} />
      <TextField label="Email" type="email" autoComplete="email" {...fieldProps(register, errors, 'email')} />
      <PasswordField
        label="Password"
        autoComplete="new-password"
        {...fieldProps(register, errors, 'password')}
        helperText={errors.password?.message ?? 'At least 8 characters with a letter and a number'}
      />
      <PasswordField
        label="Confirm password"
        autoComplete="new-password"
        {...fieldProps(register, errors, 'confirmPassword')}
      />
      <Typography variant="caption" color="text.secondary">
        New accounts join as a Contributor. An admin can change your role later.
      </Typography>
      <Button
        type="submit"
        variant="contained"
        size="large"
        disabled={isSubmitting}
        startIcon={isSubmitting ? <CircularProgress size={18} color="inherit" /> : null}
      >
        {isSubmitting ? 'Creating account' : 'Create account'}
      </Button>
    </Stack>
  );
}
