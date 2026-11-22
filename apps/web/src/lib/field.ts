import type { FieldErrors, FieldValues, Path, UseFormRegister, UseFormSetError } from 'react-hook-form';
import { ApiClientError } from './api';

export function fieldProps<T extends FieldValues>(
  register: UseFormRegister<T>,
  errors: FieldErrors<T>,
  name: Path<T>,
) {
  const { ref, ...rest } = register(name);
  const error = errors[name];
  return {
    ...rest,
    inputRef: ref,
    error: Boolean(error),
    helperText: typeof error?.message === 'string' ? error.message : undefined,
  };
}

export function applyServerFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiClientError) || !error.details) {
    return false;
  }
  let applied = false;
  for (const field of fields) {
    const messages = error.details[field as string];
    if (messages?.[0]) {
      setError(field, { type: 'server', message: messages[0] });
      applied = true;
    }
  }
  return applied;
}
