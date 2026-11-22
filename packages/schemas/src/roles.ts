import { z } from 'zod';

/**
 * Roles:
 * - admin: managers. Can do everything a contributor can, plus manage users.
 * - contributor: employees. Day-to-day use of the product.
 */
export const ROLES = ['admin', 'contributor'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = z.infer<typeof roleSchema>;

/** Role assigned to every self-service sign-up. Only an admin can promote. */
export const DEFAULT_ROLE: Role = 'contributor';

export const PERMISSIONS = ['app:use', 'users:read', 'users:update-role'] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ['app:use', 'users:read', 'users:update-role'],
  contributor: ['app:use'],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasRole(role: Role | null | undefined, allowed: readonly Role[]): boolean {
  return role != null && allowed.includes(role);
}

export function permissionsFor(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
