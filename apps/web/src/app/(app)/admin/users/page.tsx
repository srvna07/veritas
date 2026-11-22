import type { Metadata } from 'next';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { listUsers } from '@veritas/db';
import { RoleSelect } from '@/components/RoleSelect';
import { requireRole } from '@/lib/session';

export const metadata: Metadata = { title: 'Users' };

export default async function UsersPage() {
  const me = await requireRole(['admin']);
  const users = await listUsers();

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Users
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Admins (managers) can manage users. Contributors (employees) use the product. Role changes
        take effect the next time that person signs in.
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Joined</TableCell>
              <TableCell>Role</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{u.createdAt.toISOString().slice(0, 10)}</TableCell>
                <TableCell>
                  <RoleSelect userId={u.id} role={u.role} isSelf={u.id === me.id} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
