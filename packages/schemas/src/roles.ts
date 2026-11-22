import { z } from 'zod';

export const ROLES = ['contributor', 'admin'] as const;

export const roleSchema = z.enum(ROLES);

export type Role = z.infer<typeof roleSchema>;

export const ROLE_LABELS: Record<Role, string> = {
  contributor: 'Contributor',
  admin: 'Admin',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  contributor: 'Employee',
  admin: 'Manager',
};

export const DEFAULT_ROLE: Role = 'contributor';

export const PERMISSIONS = ['users:read', 'users:manage_roles'] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  contributor: [],
  admin: ['users:read', 'users:manage_roles'],
};

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
