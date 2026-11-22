export const DEFAULT_REDIRECT = '/dashboard';

export function safeNextPath(value: string | string[] | undefined | null): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || candidate.length > 512) {
    return DEFAULT_REDIRECT;
  }
  if (!candidate.startsWith('/') || candidate.startsWith('//') || candidate.includes('\\')) {
    return DEFAULT_REDIRECT;
  }
  if (/[\u0000-\u001f]/.test(candidate)) {
    return DEFAULT_REDIRECT;
  }
  return candidate;
}
