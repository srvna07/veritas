'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Button, { type ButtonProps } from '@mui/material/Button';
import MuiLink, { type LinkProps as MuiLinkProps } from '@mui/material/Link';

// Server components cannot pass `component={Link}` to MUI (a function prop crossing the
// server/client boundary), so these thin client wrappers do it instead.

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  color?: ButtonProps['color'];
  variant?: ButtonProps['variant'];
}

export function LinkButton({ href, children, color, variant }: LinkButtonProps) {
  return (
    <Button component={Link} href={href} color={color} variant={variant}>
      {children}
    </Button>
  );
}

interface TextLinkProps {
  href: string;
  children: ReactNode;
  variant?: MuiLinkProps['variant'];
  sx?: MuiLinkProps['sx'];
}

export function TextLink({ href, children, variant, sx }: TextLinkProps) {
  return (
    <MuiLink component={Link} href={href} variant={variant} sx={sx}>
      {children}
    </MuiLink>
  );
}
