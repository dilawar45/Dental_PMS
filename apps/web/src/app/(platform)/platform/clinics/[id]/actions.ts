'use server';

import crypto from 'node:crypto';
import { requireSuperAdmin, getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin, createSupportToken } from '@dental-pms/db';
import { clinics, users, clinicInvites } from '@dental-pms/db/schema';
import { setSupportModeCookie } from '@/lib/auth/support-mode';
import { logPlatformAudit } from '@/lib/platform-audit';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function enterSupportModeAction(clinicId: string): Promise<void> {
  const context = await requireSuperAdmin();
  const superAdminId = context.user.id;

  const { targetClinic, owner } = await withPlatformAdmin(
    db,
    async (tx) => {
      const [c] = await tx.select().from(clinics).where(eq(clinics.id, clinicId));
      if (!c) throw new Error('Clinic not found');

      if (c.status === 'archived') {
        throw new Error('Cannot enter support mode for an archived clinic');
      }

      // Find primary owner
      const [primaryOwner] = await tx
        .select()
        .from(users)
        .where(and(eq(users.clinicId, clinicId), eq(users.role, 'owner')));

      return { targetClinic: c, owner: primaryOwner };
    },
    { actorId: superAdminId }
  );

  // If no owner exists yet (e.g. pending invite), create token pointing to ownerId or superAdminId as fallback
  const ownerId = owner ? owner.id : superAdminId;

  // Generate HMAC-SHA256 support token (60-minute TTL)
  const token = createSupportToken(
    {
      superAdminId,
      targetClinicId: clinicId,
      ownerId,
    },
    60
  );

  // Set httpOnly cookie
  await setSupportModeCookie(token);

  // Log support.entered to platform_audit_log
  await logPlatformAudit({
    actorId: superAdminId,
    action: 'support.entered',
    targetClinicId: clinicId,
    meta: {
      clinicName: targetClinic.name,
      impersonatedOwnerId: ownerId,
      ttlMinutes: 60,
    },
  });

  // Redirect to tenant app dashboard
  redirect('/dashboard');
}

export async function updateClinicStatusAction(
  clinicId: string,
  newStatus: 'active' | 'suspended' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  const context = await requireSuperAdmin();

  // Guard: Destructive action blocked in support mode
  const currentContext = await getCurrentUser();
  if (currentContext?.isSupportMode) {
    return { success: false, error: 'Destructive clinic actions are blocked during active Support Mode.' };
  }

  try {
    await withPlatformAdmin(
      db,
      async (tx) => {
        await tx
          .update(clinics)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(clinics.id, clinicId));
      },
      { actorId: context.user.id }
    );

    const actionMap = {
      active: 'clinic.reactivated' as const,
      suspended: 'clinic.suspended' as const,
      archived: 'clinic.archived' as const,
    };

    await logPlatformAudit({
      actorId: context.user.id,
      action: actionMap[newStatus],
      targetClinicId: clinicId,
      meta: { newStatus },
    });

    revalidatePath(`/platform/clinics/${clinicId}`);
    revalidatePath('/platform/clinics');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update clinic status',
    };
  }
}

export async function generateNewInviteAction(
  clinicId: string,
  email: string,
  role: 'owner' | 'dentist' | 'receptionist' | 'assistant' = 'owner'
): Promise<{ success: boolean; inviteUrl?: string; error?: string }> {
  const context = await requireSuperAdmin();

  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') || 'http';
  const origin = `${proto}://${host}`;

  try {
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    await withPlatformAdmin(
      db,
      async (tx) => {
        await tx.insert(clinicInvites).values({
          clinicId,
          email: email.toLowerCase(),
          token: inviteToken,
          role,
          expiresAt,
        });
      },
      { actorId: context.user.id }
    );

    await logPlatformAudit({
      actorId: context.user.id,
      action: 'invite.created',
      targetClinicId: clinicId,
      meta: { email, role },
    });

    revalidatePath(`/platform/clinics/${clinicId}`);
    return { success: true, inviteUrl: `${origin}/invite/${inviteToken}` };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate invitation',
    };
  }
}
