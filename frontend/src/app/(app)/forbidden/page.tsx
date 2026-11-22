import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import { LinkButton } from '@/components/NavLinks';
import { requireUser } from '@/lib/session';

export default async function ForbiddenPage() {
  await requireUser();
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Alert severity="warning">You do not have permission to view that page.</Alert>
      <LinkButton href="/" variant="outlined">
        Back to dashboard
      </LinkButton>
    </Stack>
  );
}
