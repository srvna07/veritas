import { compare, hash } from 'bcryptjs';

export function hashPassword(password: string, cost: number): Promise<string> {
  return hash(password, cost);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export async function createDummyHash(cost: number): Promise<string> {
  return hash('veritas-dummy-password', cost);
}
