import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { users, clinics } from '@dental-pms/db/schema';
import type { User, UserRole } from '@dental-pms/types';
import { eq, and } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import {
  getSupportModeFromCookies,
  clearSupportModeCookie,
  AuthenticationError,
} from './support-mode';
import type { SupportModeOptions } from '@dental-pms/db';

export interface CurrentUserContext {
  user: User & { clinicId: string };
  clinicId: string;
  realUser?: User;
  isSupportMode?: boolean;
  supportSessionExpiresAt?: number;
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export { AuthenticationError };

/**
 * Returns SupportModeOptions for withClinic based on the active CurrentUserContext.
 */
export function getClinicDbOptions(context: CurrentUserContext): SupportModeOptions {
  if (context.isSupportMode && context.realUser) {
    return {
      supportMode: true,
      realActorId: context.realUser.id,
      impersonatedUserId: context.user.id,
      actorId: context.realUser.id,
    };
  }

  return {
    actorId: context.user.id,
  };
}

/**
 * Reads the Supabase session, retrieves the matching profile from public.users,
 * evaluates Support Mode if applicable, and returns the active user context.
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

  if (!profile || !profile.active) {
    // User profile missing or deactivated -> clear stale session
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore cleanup error
    }
    return null;
  }

  // Handle Platform Super-Admin
  if (profile.role === 'super_admin') {
    const supportCheck = await getSupportModeFromCookies();

    if (supportCheck) {
      if (!supportCheck.valid) {
        await clearSupportModeCookie();
        throw new AuthenticationError(`Support session invalid: ${supportCheck.reason}`);
      }

      const { payload } = supportCheck;
      if (payload.superAdminId !== profile.id) {
        await clearSupportModeCookie();
        throw new AuthenticationError('Support token does not belong to the active super-admin');
      }

      // Verify target clinic is valid and active
      const [targetClinic] = await db
        .select()
        .from(clinics)
        .where(eq(clinics.id, payload.targetClinicId));

      if (!targetClinic || targetClinic.status === 'archived') {
        await clearSupportModeCookie();
        throw new AuthenticationError('Target clinic not accessible or archived');
      }

      // Resolve clinic owner to impersonate
      const [owner] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.clinicId, targetClinic.id),
            eq(users.role, 'owner')
          )
        );

      const effectiveUser: User = owner || {
        ...profile,
        clinicId: targetClinic.id,
        role: 'owner',
      };

      return {
        user: { ...effectiveUser, clinicId: targetClinic.id },
        clinicId: targetClinic.id,
        realUser: profile,
        isSupportMode: true,
        supportSessionExpiresAt: payload.expiresAt,
      };
    }

    // Super-admin outside support mode (no clinic scoped)
    return {
      user: { ...profile, clinicId: '' },
      clinicId: '',
      realUser: profile,
      isSupportMode: false,
    };
  }

  // Regular clinic staff
  return {
    user: { ...profile, clinicId: profile.clinicId || '' },
    clinicId: profile.clinicId || '',
    realUser: profile,
    isSupportMode: false,
  };
}

/**
 * Server-side route guard for clinic-scoped routes (/(app)/*).
 * If a super-admin hits a clinic route without support mode, redirects them to /platform/dashboard.
 */
export async function requireUser(): Promise<CurrentUserContext> {
  const context = await getCurrentUser();
  if (!context) {
    redirect('/login');
  }

  // Super-admin without active support mode cannot access clinic dashboard directly
  if (context.user.role === 'super_admin' && !context.isSupportMode) {
    redirect('/platform/dashboard');
  }

  return context;
}

/**
 * Server-side route guard ensuring the active user has super-admin permissions.
 * Throws 403 AuthorizationError if caller is not a super_admin.
 */
export async function requireSuperAdmin(): Promise<CurrentUserContext> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    redirect('/login');
  }

  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id));

  if (!profile || !profile.active) {
    redirect('/login');
  }

  if (profile.role !== 'super_admin' || !profile.isSuperAdmin) {
    throw new AuthorizationError(
      `Access Denied: Role '${profile.role}' is not authorized to access platform administration.`
    );
  }

  return {
    user: { ...profile, clinicId: '' },
    clinicId: '',
    realUser: profile,
    isSupportMode: false,
  };
}

export async function requireRole(allowedRoles: UserRole[]): Promise<CurrentUserContext> {
  const context = await requireUser();

  if (!allowedRoles.includes(context.user.role)) {
    throw new AuthorizationError(
      `Access Denied: Role '${context.user.role}' is not authorized to access this resource. Allowed roles: ${allowedRoles.join(', ')}`
    );
  }

  return context;
}
