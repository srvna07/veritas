'use client';

import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface FormShellProps {
  title: string;
  subtitle?: string;
  error?: string | null;
  info?: string | null;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Shared layout for the auth forms: heading, alert area, fields, submit button, footer links. */
export function FormShell(props: FormShellProps) {
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        props.onSubmit();
      }}
    >
      <Stack spacing={2.5}>
        <div>
          <Typography variant="h6" component="h1">
            {props.title}
          </Typography>
          {props.subtitle && (
            <Typography variant="body2" color="text.secondary">
              {props.subtitle}
            </Typography>
          )}
        </div>
        {props.info && <Alert severity="success">{props.info}</Alert>}
        {props.error && (
          <Alert severity="error" role="alert">
            {props.error}
          </Alert>
        )}
        {props.children}
        <Button type="submit" variant="contained" size="large" disabled={props.submitting}>
          {props.submitting ? 'Please wait…' : props.submitLabel}
        </Button>
        {props.footer && (
          <Stack spacing={1} sx={{ textAlign: 'center' }}>
            {props.footer}
          </Stack>
        )}
      </Stack>
    </form>
  );
}
