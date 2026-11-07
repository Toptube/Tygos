/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AUTH CRYPTO & HASHING SERVICE
 *
 * // INTEGRATION POINT: Client-side demonstration salted hashing.
 * WARNING: In a production architecture with an authoritative backend,
 * password hashing and verification MUST run exclusively on the server
 * (e.g., using Argon2id or bcrypt) over TLS, returning signed session
 * tokens (JWT / HttpOnly cookies).
 */

/**
 * Generates a random 6-digit PIN (100000 - 999999).
 * Strictly forbids hardcoded defaults like '1234' or '123456'.
 */
export function generateRandomPin6(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Generates a random cryptographic salt string.
 */
export function generateRandomSalt(): string {
  return Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
}

/**
 * Hashes a password with a salt for demonstration storage.
 * // INTEGRATION POINT: Replace with Argon2id / bcrypt on server.
 */
export function hashPassword(password: string, salt: string): string {
  let hash = 0;
  const combined = `${salt}:${password}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(16)}_${combined.length}`;
}

/**
 * Verifies a candidate password against stored hash + salt,
 * with legacy plaintext fallback for backward compatibility.
 */
export function verifyPassword(
  candidate: string,
  storedHash?: string,
  salt?: string,
  plainFallback?: string
): boolean {
  if (storedHash && salt) {
    return hashPassword(candidate, salt) === storedHash;
  }
  if (plainFallback) {
    return candidate === plainFallback;
  }
  return false;
}
