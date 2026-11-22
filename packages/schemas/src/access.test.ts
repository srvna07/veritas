import { describe, expect, it } from 'vitest';
import { decideRoute, safeRedirectPath } from './access';

describe('decideRoute', () => {
  it('sends anonymous users to login for protected pages', () => {
    expect(decideRoute('/', null)).toBe('login');
    expect(decideRoute('/admin/users', null)).toBe('login');
  });

  it('lets anonymous users reach the auth pages', () => {
    for (const p of ['/login', '/signup', '/forgot-password', '/reset-password']) {
      expect(decideRoute(p, null)).toBe('allow');
    }
  });

  it('bounces signed-in users off the auth pages', () => {
    expect(decideRoute('/login', 'contributor')).toBe('home');
    expect(decideRoute('/signup', 'admin')).toBe('home');
  });

  it('keeps contributors out of admin routes but lets admins in', () => {
    expect(decideRoute('/admin/users', 'contributor')).toBe('forbidden');
    expect(decideRoute('/admin', 'contributor')).toBe('forbidden');
    expect(decideRoute('/admin/users', 'admin')).toBe('allow');
  });

  it('does not treat look-alike paths as admin routes', () => {
    expect(decideRoute('/administrator', 'contributor')).toBe('allow');
  });

  it('allows both roles on ordinary pages', () => {
    expect(decideRoute('/', 'contributor')).toBe('allow');
    expect(decideRoute('/', 'admin')).toBe('allow');
  });
});

describe('safeRedirectPath', () => {
  it('keeps same-site relative paths', () => {
    expect(safeRedirectPath('/admin/users')).toBe('/admin/users');
  });
  it('reduces a same-origin absolute URL to its path', () => {
    const origin = 'http://localhost:3000';
    expect(safeRedirectPath('http://localhost:3000/admin/users?x=1', '/', origin)).toBe(
      '/admin/users?x=1',
    );
  });
  it('rejects an absolute URL on another origin', () => {
    expect(safeRedirectPath('https://evil.com/steal', '/', 'http://localhost:3000')).toBe('/');
    expect(safeRedirectPath('http://localhost:3000.evil.com/x', '/', 'http://localhost:3000')).toBe(
      '/',
    );
  });
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    'javascript:alert(1)',
    '',
    null,
    undefined,
  ])('falls back for %s', (v) => {
    expect(safeRedirectPath(v)).toBe('/');
  });
});
