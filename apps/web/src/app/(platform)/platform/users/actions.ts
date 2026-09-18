'use server';

import { requireSuperAdmin, getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import { logPlatformAudit } from '@/lib/platform-audit';
import { eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function togglePlatformUserActiveAction(
  userId: string,
  newActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const context = await requireSuperAdmin();

  // Guard: Destructive action blocked in support mode
  const currentContext = await getCurrentUser();
  if (currentContext?.isSupportMode) {
    return { success: false, error: 'Destructive user actions are blocked during active Support Mode.' };
  }

  // Prevent self-deactivation
  if (context.user.id === userId) {
    return { success: false, error: 'You cannot deactivate your own super-admin account.' };
  }

  try {
    const targetUser = await withPlatformAdmin(
      db,
      async (tx) => {
        const [u] = await tx
          .update(users)
          .set({ active: newActive, updatedAt: new Date() })
          .where(eq(users.id, userId))
          .returning();
        return u;
      },
      { actorId: context.user.id }
    );

    await logPlatformAudit({
      actorId: context.user.id,
      action: newActive ? 'user.role_change' : 'user.force_logout',
      targetClinicId: targetUser?.clinicId,
      meta: {
        userId,
        targetEmail: targetUser?.email,
        active: newActive,
      },
    });

    revalidatePath('/platform/users');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update user status',
    };
  }
}

export async function resetPlatformUserPasswordAction(
  userId: string,
  temporaryPassword: string
): Promise<{ success: boolean; error?: string }> {
  const context = await requireSuperAdmin();

  if (temporaryPassword.length < 8) {
    return { success: false, error: 'Temporary password must be at least 8 characters' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    // Update password in auth.users using postgres crypt
    await db.execute(
      sql`UPDATE auth.users
          SET encrypted_password = crypt(${temporaryPassword}, gen_salt('bf')),
              updated_at = now()
          WHERE id = ${userId}::uuid`
    );

    await logPlatformAudit({
      actorId: context.user.id,
      action: 'user.password_reset',
      targetClinicId: targetUser.clinicId,
      meta: {
        userId,
        targetEmail: targetUser.email,
        reason: 'Super-admin manual password reset',
      },
    });

    revalidatePath('/platform/users');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset password',
    };
  }
}
