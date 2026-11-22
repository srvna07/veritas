'use client';

import type { ComponentProps } from 'react';
import NextLink from 'next/link';
import MuiLink from '@mui/material/Link';

type NextMuiLinkProps = Omit<ComponentProps<typeof MuiLink>, 'component' | 'href'> & {
  href: string;
};

export function NextMuiLink({ href, children, ...rest }: NextMuiLinkProps) {
  return (
    <MuiLink component={NextLink} href={href} underline="hover" {...rest}>
      {children}
    </MuiLink>
  );
}
