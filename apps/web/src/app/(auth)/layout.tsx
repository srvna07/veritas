import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
      <Paper variant="outlined" sx={{ width: '100%', maxWidth: 420, p: { xs: 3, sm: 4 } }}>
        <Typography
          variant="h5"
          component="p"
          sx={{ fontWeight: 700, mb: 3, color: 'primary.main' }}
        >
          Veritas
        </Typography>
        {children}
      </Paper>
    </Box>
  );
}
