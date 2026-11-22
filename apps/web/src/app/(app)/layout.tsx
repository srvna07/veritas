import type { ReactNode } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { can } from '@veritas/schemas';
import { signOutAction } from '@/app/actions/auth';
import { LinkButton } from '@/components/NavLinks';
import { requireUser } from '@/lib/session';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="static" color="primary" enableColorOnDark>
        <Toolbar sx={{ gap: 1 }}>
          <Typography variant="h6" component="p" sx={{ fontWeight: 700, mr: 2 }}>
            Veritas
          </Typography>
          <LinkButton color="inherit" href="/">
            Dashboard
          </LinkButton>
          {can(user.role, 'users:read') && (
            <LinkButton color="inherit" href="/admin/users">
              Users
            </LinkButton>
          )}
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {user.name}
          </Typography>
          <Chip
            size="small"
            label={user.role}
            sx={{
              bgcolor: 'primary.contrastText',
              color: 'primary.main',
              textTransform: 'capitalize',
            }}
          />
          <form action={signOutAction}>
            <Button color="inherit" type="submit">
              Sign out
            </Button>
          </form>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
}
