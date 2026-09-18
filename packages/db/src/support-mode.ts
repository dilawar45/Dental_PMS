import crypto from 'node:crypto';
import type { ClinicTransaction, Database } from './index';
import { withClinic } from './index';

export interface SupportTokenPayload {
  superAdminId: string;
  targetClinicId: string;
  ownerId: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export function getDefaultSecretKey(): string {
  return (
    process.env['NEXTAUTH_SECRET'] ||
    process.env['JWT_SECRET'] ||
    'super-secret-dental-jwt-key-change-in-production-2026'
  );
}

/**
 * Creates a cryptographically signed HMAC-SHA256 support token with 60-minute TTL.
 */
export function createSupportToken(
  data: Omit<SupportTokenPayload, 'expiresAt'>,
  ttlMinutes = 60,
  secretKey = getDefaultSecretKey()
): string {
  const payload: SupportTokenPayload = {
    ...data,
    expiresAt: Date.now() + ttlMinutes * 60 * 1000,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadStr)
    .digest('base64url');

  return `${payloadStr}.${signature}`;
}

/**
 * Validates the cryptographic HMAC-SHA256 signature and expiration of a support token.
 * Returns { valid: false } if tampered, malformed, or expired.
 */
export function verifySupportToken(
  token: string,
  secretKey = getDefaultSecretKey()
): { valid: true; payload: SupportTokenPayload } | { valid: false; reason: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'Missing token' };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [payloadStr, signature] = parts;

  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(payloadStr)
    .digest('base64url');

  // Constant-time signature comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return { valid: false, reason: 'Invalid token signature (tampered)' };
  }

  try {
    const payloadJson = Buffer.from(payloadStr, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as SupportTokenPayload;

    if (!payload.superAdminId || !payload.targetClinicId || !payload.ownerId || !payload.expiresAt) {
      return { valid: false, reason: 'Invalid payload structure' };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: 'Support session expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Corrupt payload' };
  }
}

/**
 * Validates that an active user and support token meet all support-mode security requirements.
 * Rejects with a 401 AuthenticationError if invalid, tampered, expired, or non-super-admin.
 */
export function resolveSupportModeAccess(
  token: string | undefined | null,
  user: { id: string; role: string },
  secretKey = getDefaultSecretKey()
): SupportTokenPayload {
  if (!token) {
    throw new AuthenticationError('Support token missing');
  }

  if (user.role !== 'super_admin') {
    throw new AuthenticationError('Unauthorized: User is not a platform super-admin');
  }

  const result = verifySupportToken(token, secretKey);
  if (!result.valid) {
    throw new AuthenticationError(`Unauthorized support access: ${result.reason}`);
  }

  if (result.payload.superAdminId !== user.id) {
    throw new AuthenticationError('Unauthorized: Support token does not match active super-admin actor');
  }

  return result.payload;
}

/**
 * Executes a clinic query with verified support mode.
 * Re-verifies signature and expiry server-side before setting DB session variables.
 * Rejects with 401 if token is expired, tampered, or caller is not super-admin.
 */
export async function withVerifiedSupportClinic<T>(
  db: Database,
  clinicId: string,
  token: string | undefined | null,
  user: { id: string; role: string },
  fn: (tx: ClinicTransaction) => Promise<T>,
  secretKey = getDefaultSecretKey()
): Promise<T> {
  const payload = resolveSupportModeAccess(token, user, secretKey);

  if (payload.targetClinicId !== clinicId) {
    throw new AuthenticationError('Unauthorized: Target clinic mismatch with support session');
  }

  return withClinic(
    db,
    clinicId,
    fn,
    {
      supportMode: true,
      realActorId: payload.superAdminId,
      impersonatedUserId: payload.ownerId,
      actorId: payload.superAdminId,
    }
  );
}
