import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export async function hashToken(token: string): Promise<string> {
  return argon2.hash(token);
}

export async function verifyToken(hash: string, token: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, token);
  } catch {
    return false;
  }
}

export function generateSlug(): string {
  return nanoid();
}

export async function slugifyUnique(attempt = 0): Promise<string> {
  const base = generateSlug();
  return attempt > 0 ? `${base}-${attempt}` : base;
}
