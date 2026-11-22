import { describe, expect, it } from 'vitest';
import { can, hasRole, permissionsFor } from './roles';

describe('RBAC', () => {
  it('lets admins do everything', () => {
    expect(can('admin', 'app:use')).toBe(true);
    expect(can('admin', 'users:read')).toBe(true);
    expect(can('admin', 'users:update-role')).toBe(true);
  });

  it('limits contributors to using the app', () => {
    expect(can('contributor', 'app:use')).toBe(true);
    expect(can('contributor', 'users:read')).toBe(false);
    expect(can('contributor', 'users:update-role')).toBe(false);
  });

  it('denies everything when there is no role', () => {
    expect(can(null, 'app:use')).toBe(false);
    expect(can(undefined, 'users:read')).toBe(false);
    expect(hasRole(null, ['admin', 'contributor'])).toBe(false);
  });

  it('checks role membership', () => {
    expect(hasRole('admin', ['admin'])).toBe(true);
    expect(hasRole('contributor', ['admin'])).toBe(false);
    expect(hasRole('contributor', ['admin', 'contributor'])).toBe(true);
  });

  it('admin permissions are a superset of contributor permissions', () => {
    const admin = permissionsFor('admin');
    for (const p of permissionsFor('contributor')) expect(admin).toContain(p);
  });
});
