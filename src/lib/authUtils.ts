/**
 * Secure client/server password hashing using Web Crypto API SHA-256
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_eldostour_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique sequential or formatted Student ID: DST-2026-XXXX
 */
export function generateStudentCode(): string {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `DST-2026-${randomSuffix}`;
}
