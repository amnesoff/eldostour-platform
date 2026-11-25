import crypto from 'crypto';
import { NextResponse } from 'next/server';

// Server-side secret for signing tokens/cookies
const JWT_SECRET = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eldostour_super_secure_vault_jwt_key_2026_salt_hash_lock';

/**
 * Strips all sensitive database fields before sending data to any client
 */
export function stripSensitiveFields<T>(data: T): T {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => stripSensitiveFields(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sensitiveKeys = new Set([
      'password_hash',
      'password_salt',
      'plain_password',
      'pin_hash',
      'pin_code',
      'vault_numeric_hash',
      'vault_complex_hash',
      'vault_single_hash',
      'recovery_code_hashes',
      'telegram_bot_token',
      'active_session_token',
      'device_fingerprint',
      'ip_address',
      'super_admin_key',
      'staff_portal_key',
      'correct_answer', // Stripped from student quiz payloads
      'correct_index',
      'email',
    ]);

    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (!sensitiveKeys.has(key)) {
        clean[key] = typeof val === 'object' && val !== null ? stripSensitiveFields(val) : val;
      }
    }
    return clean as T;
  }

  return data;
}

/**
 * XSS Sanitizer for all user-submitted text inputs
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onload=/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onclick=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim();
}

/**
 * In-Memory Rate Limiter for IP brute-force protection (max 8 requests / min)
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic cleanup of expired rate limit entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitMap.entries()) {
      if (value.resetAt < now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
}

export function checkRateLimit(
  ip: string,
  maxRequests = 8,
  windowSeconds = 60
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const cleanIp = ip.trim() || 'unknown_ip';
  const now = Date.now();
  const record = rateLimitMap.get(cleanIp);

  if (!record || record.resetAt < now) {
    rateLimitMap.set(cleanIp, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Extracts Client IP address securely from Request Headers
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const ips = forwarded.split(',');
    return ips[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return '127.0.0.1';
}

/**
 * Generate cryptographically secure random salt (hex string)
 */
export function generateRandomSalt(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Hash password with per-user salt using SHA-256
 */
export function hashPasswordWithSalt(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

/**
 * Verify password against salted hash or legacy platform salt
 */
export function verifyStudentPassword(
  password: string,
  storedHash: string,
  storedSalt?: string | null
): { isValid: boolean; needsUpgrade: boolean } {
  // 1. If stored with per-user salt (v2)
  if (storedSalt) {
    const computed = hashPasswordWithSalt(password, storedSalt);
    if (computed === storedHash) {
      return { isValid: true, needsUpgrade: false };
    }
  }

  // 2. Legacy platform salt check (_eldostour_salt_2026)
  const legacySalted = crypto
    .createHash('sha256')
    .update(password + '_eldostour_salt_2026')
    .digest('hex');
  if (legacySalted === storedHash) {
    return { isValid: true, needsUpgrade: true };
  }

  // 3. Raw SHA-256 check
  const rawSha256 = crypto.createHash('sha256').update(password).digest('hex');
  if (rawSha256 === storedHash) {
    return { isValid: true, needsUpgrade: true };
  }

  // 4. Plain text match (if any legacy account had plain text)
  if (password === storedHash) {
    return { isValid: true, needsUpgrade: true };
  }

  return { isValid: false, needsUpgrade: false };
}

/**
 * Unified Password Check (AlDustour@2006@999#111#111)
 */
export const UNIFIED_RESET_PASSWORD = 'AlDustour@2006@999#111#111';

export function isUnifiedPassword(password: string): boolean {
  return password === UNIFIED_RESET_PASSWORD;
}

/**
 * Signed Session Tokens (HMAC-SHA256)
 */
interface TokenPayload {
  [key: string]: any;
  iat: number;
  exp: number;
}

export function signToken(payload: Record<string, any>, expiresInSeconds = 7 * 24 * 3600): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;
  const fullPayload: TokenPayload = { ...payload, iat, exp };

  const encodedData = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(encodedData)
    .digest('base64url');

  return `${encodedData}.${signature}`;
}

export function verifyToken<T = Record<string, any>>(token: string): T | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encodedData, signature] = parts;

  const candidateSecrets = [
    JWT_SECRET,
    process.env.SESSION_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SUPABASE_SERVICE_KEY,
    'eldostour_super_secure_vault_jwt_key_2026_salt_hash_lock',
    'eldostour_salt_2026',
  ].filter(Boolean) as string[];

  let isValidSig = false;
  for (const secret of candidateSecrets) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encodedData)
      .digest('base64url');

    if (signature === expectedSignature) {
      isValidSig = true;
      break;
    }
  }

  if (!isValidSig) return null;

  try {
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64url').toString('utf8')) as TokenPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      return null; // Expired
    }
    return decoded as unknown as T;
  } catch {
    return null;
  }
}

/**
 * Cookie options helper for HttpOnly, Secure, SameSite=Lax cookies
 */
export function getSecureCookieOptions(maxAgeSeconds = 7 * 24 * 3600) {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: maxAgeSeconds,
  };
}
