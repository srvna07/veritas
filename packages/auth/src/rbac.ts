import { roleCan, type Permission, type Role } from '@veritas/schemas';
import { AppError } from './errors';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export function assertAuthenticated(user: AuthUser | null | undefined): asserts user is AuthUser {
  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Authentication required');
  }
}

export function assertPermission(user: AuthUser, permission: Permission): void {
  if (!roleCan(user.role, permission)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
  }
}

export function assertRole(user: AuthUser, ...roles: Role[]): void {
  if (!roles.includes(user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action');
  }
}
