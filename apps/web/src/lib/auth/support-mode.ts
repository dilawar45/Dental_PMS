import { cookies } from 'next/headers';
import {
  type SupportTokenPayload,
  AuthenticationError,
  createSupportToken,
  verifySupportToken,
  resolveSupportModeAccess,
  withVerifiedSupportClinic,
} from '@dental-pms/db';

export type { SupportTokenPayload };
export {
  AuthenticationError,
  createSupportToken,
  verifySupportToken,
  resolveSupportModeAccess,
  withVerifiedSupportClinic,
};

export const SUPPORT_COOKIE_NAME = 'dental_support_token';

/**
 * Sets the httpOnly support session cookie in the Next.js response context.
 */
export async function setSupportModeCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SUPPORT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60, // 60 minutes
  });
}

/**
 * Clears the support session cookie.
 */
export async function clearSupportModeCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SUPPORT_COOKIE_NAME);
}

/**
 * Reads and verifies the support mode cookie from request headers.
 */
export async function getSupportModeFromCookies(): Promise<
  { valid: true; payload: SupportTokenPayload } | { valid: false; reason: string } | null
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPPORT_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySupportToken(token);
}
