'use client';

import { useState, useTransition } from 'react';
import FormHelperText from '@mui/material/FormHelperText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { ROLES, roleSchema, type Role } from '@veritas/schemas';
import { updateUserRoleAction } from '@/app/actions/admin';

export function RoleSelect({
  userId,
  role,
  isSelf,
}: {
  userId: string;
  role: Role;
  isSelf: boolean;
}) {
  const [value, setValue] = useState<Role>(role);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Select
        size="small"
        value={value}
        disabled={pending}
        inputProps={{ 'aria-label': 'Role', 'data-self': isSelf }}
        onChange={(e) => {
          const next = roleSchema.parse(e.target.value);
          const previous = value;
          setValue(next);
          setError(null);
          startTransition(async () => {
            const result = await updateUserRoleAction({ userId, role: next });
            if (!result.ok) {
              setValue(previous);
              setError(result.error);
            }
          });
        }}
        sx={{ minWidth: 150, textTransform: 'capitalize' }}
      >
        {ROLES.map((r) => (
          <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>
            {r}
          </MenuItem>
        ))}
      </Select>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </>
  );
}
