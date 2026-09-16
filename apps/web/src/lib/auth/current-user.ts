import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users } from '@dental-pms/db/schema';
import type { User, UserRole } from '@dental-pms/types';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export interface CurrentUserContext {
  user: User;
  clinicId: string;
}

/**
 * Reads the Supabase session, retrieves the matching profile from public.users,
 * and returns the typed user model with the active clinicId.
 *
 * Throws an error if a valid auth session exists but no public.users row is found
 * (indicates a critical data integrity violation).
 * Returns null if the user is unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUserContext | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!profile) {
    throw new Error(
      `Data integrity violation: Authenticated user ${authUser.id} (${authUser.email}) has no matching record in public.users.`
    );
  }

  return {
    user: profile,
    clinicId: profile.clinicId,
  };
}

/**
 * Server-side route guard ensuring the active user has one of the allowed roles.
 * Redirects to /login if unauthenticated, or throws a 403 authorization error if
 * the user's role is not permitted.
 */
export async function requireUser(): Promise<CurrentUserContext> {
  const context = await getCurrentUser();
  if (!context) {
    redirect('/login');
  }
  return context;
}

export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUserContext> {
  const context = await requireUser();

  if (!allowedRoles.includes(context.user.role)) {
    // Return forbidden or redirect with 403
    throw new AuthorizationError(
      `Access Denied: Role '${context.user.role}' is not authorized to access this resource. Allowed roles: ${allowedRoles.join(', ')}`
    );
  }

  return context;
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}
