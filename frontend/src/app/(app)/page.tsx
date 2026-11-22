import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { permissionsFor } from '@veritas/schemas';
import { requireUser } from '@/lib/session';

export default async function DashboardPage() {
  const user = await requireUser();

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Welcome, {user.name}
      </Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          Signed in as {user.email} with the <strong>{user.role}</strong> role
        </Typography>
        <Typography variant="body2" gutterBottom>
          Your permissions:
        </Typography>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
          {permissionsFor(user.role).map((p) => (
            <Chip key={p} label={p} size="small" variant="outlined" />
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
