'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';

type AuthLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export function AuthLayout({ title, subtitle, children, footer }: AuthLayoutProps) {
  return (
    <Box
      component="main"
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 6,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 440 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 3, alignItems: 'center', justifyContent: 'center' }}>
          <VerifiedUserRoundedIcon color="primary" fontSize="large" />
          <Typography variant="h5" component="span" color="primary">
            Veritas
          </Typography>
        </Stack>
        <Card>
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Stack spacing={0.5} sx={{ mb: 3 }}>
              <Typography variant="h5" component="h1">
                {title}
              </Typography>
              {subtitle ? (
                <Typography variant="body2" color="text.secondary">
                  {subtitle}
                </Typography>
              ) : null}
            </Stack>
            {children}
          </CardContent>
        </Card>
        {footer ? (
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" component="div">
              {footer}
            </Typography>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
