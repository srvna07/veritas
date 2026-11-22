import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@veritas/schemas';
import { LogoutButton } from '@/components/LogoutButton';
import { getCurrentUser } from '@/server/session';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?next=/dashboard');
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="span" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Veritas
          </Typography>
          <LogoutButton />
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome, {user.name}
            </Typography>
            <Typography color="text.secondary">You are signed in to Veritas.</Typography>
          </Box>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6" component="h2">
                  Your account
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 6 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Name
                    </Typography>
                    <Typography>{user.name}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography>{user.email}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" component="div">
                      Role
                    </Typography>
                    <Chip
                      size="small"
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      label={`${ROLE_LABELS[user.role]} (${ROLE_DESCRIPTIONS[user.role]})`}
                    />
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
