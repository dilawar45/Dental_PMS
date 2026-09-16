'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import type { UserRole } from '@dental-pms/types';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
});

const toggleActiveSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
});

export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    throw new Error('Forbidden: Only clinic owners can update staff roles.');
  }

  const parsed = updateRoleSchema.safeParse({ userId, role: newRole });
  if (!parsed.success) {
    throw new Error('Invalid role or user ID.');
  }

  // Prevent self-demotion if owner
  if (user.id === userId && newRole !== 'owner') {
    throw new Error('Cannot change your own role from owner.');
  }

  await withClinic(db, clinicId, async (tx) => {
    await tx
      .update(users)
      .set({
        role: parsed.data.role,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, parsed.data.userId), eq(users.clinicId, clinicId)));
  });

  revalidatePath('/settings/users');
  return { success: true };
}

export async function toggleUserActiveAction(userId: string, currentActive: boolean) {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    throw new Error('Forbidden: Only clinic owners can manage staff status.');
  }

  const newActive = !currentActive;
  const parsed = toggleActiveSchema.safeParse({ userId, active: newActive });
  if (!parsed.success) {
    throw new Error('Invalid user ID.');
  }

  // Prevent self-deactivation
  if (user.id === userId && !newActive) {
    throw new Error('Cannot deactivate your own user account.');
  }

  await withClinic(db, clinicId, async (tx) => {
    await tx
      .update(users)
      .set({
        active: newActive,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, parsed.data.userId), eq(users.clinicId, clinicId)));
  });

  revalidatePath('/settings/users');
  return { success: true };
}
