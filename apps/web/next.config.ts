import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: ['@veritas/ui', '@veritas/auth', '@veritas/db', '@veritas/schemas'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default config;
