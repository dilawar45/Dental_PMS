'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import type { UserRole } from '@dental-pms/types';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createStaffSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Valid email address is required'),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const updateStaffSchema = z.object({
  userId: z.string().uuid(),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  qualification: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
  password: z.string().min(6).optional().or(z.literal('')),
});

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
});

const toggleActiveSchema = z.object({
  userId: z.string().uuid(),
  active: z.boolean(),
});

export type StaffActionResult = {
  success?: boolean;
  error?: string;
};

/**
 * Creates a new staff member account in both auth.users and public.users.
 */
export async function createStaffUserAction(formData: FormData): Promise<StaffActionResult> {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    return { error: 'Forbidden: Only clinic owners can add new staff members.' };
  }

  const raw = {
    fullName: formData.get('fullName'),
    email: formData.get('email'),
    qualification: formData.get('qualification'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    role: formData.get('role'),
    password: formData.get('password'),
  };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { fullName, email, qualification, phone, address, role, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existing) {
      return { error: `A staff member with email "${normalizedEmail}" already exists.` };
    }

    // 1. Create or ensure record in auth.users
    const authInsert = await db.execute(
      sql`INSERT INTO auth.users (
            id, instance_id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role,
            aud, confirmation_token, recovery_token, email_change_token_new,
            email_change, email_change_token_current, phone_change, phone_change_token, reauthentication_token
          )
          VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000'::uuid,
            ${normalizedEmail},
            crypt(${password}, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            ${JSON.stringify({ full_name: fullName, role, clinic_id: clinicId })}::jsonb,
            now(),
            now(),
            'authenticated',
            'authenticated',
            '', '', '', '', '', '', '', ''
          )
          ON CONFLICT (email) DO UPDATE
          SET encrypted_password = crypt(${password}, gen_salt('bf')),
              raw_user_meta_data = ${JSON.stringify({ full_name: fullName, role, clinic_id: clinicId })}::jsonb,
              updated_at = now()
          RETURNING id`
    );

    const authUserId = authInsert[0]?.['id'] as string;
    if (!authUserId) {
      return { error: 'Failed to provision authentication account.' };
    }

    // 2. Insert into public.users
    await withClinic(db, clinicId, async (tx) => {
      await tx.insert(users).values({
        id: authUserId,
        clinicId,
        email: normalizedEmail,
        fullName,
        qualification: qualification || null,
        phone: phone || null,
        address: address || null,
        role,
        active: true,
      });
    });

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to add staff member.' };
  }
}

/**
 * Updates an existing staff member's profile, contact info, qualification, and role.
 */
export async function updateStaffUserAction(formData: FormData): Promise<StaffActionResult> {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    return { error: 'Forbidden: Only clinic owners can update staff profiles.' };
  }

  const raw = {
    userId: formData.get('userId'),
    fullName: formData.get('fullName'),
    qualification: formData.get('qualification'),
    phone: formData.get('phone'),
    address: formData.get('address'),
    role: formData.get('role'),
    password: formData.get('password') || '',
  };

  const parsed = updateStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(', ') };
  }

  const { userId, fullName, qualification, phone, address, role, password } = parsed.data;

  // Prevent self-demotion from owner role
  if (user.id === userId && role !== 'owner') {
    return { error: 'You cannot change your own role away from Owner.' };
  }

  try {
    // 1. Update public.users
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .update(users)
        .set({
          fullName,
          qualification: qualification || null,
          phone: phone || null,
          address: address || null,
          role,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.clinicId, clinicId)));
    });

    // 2. If password provided, update auth.users
    if (password && password.trim().length >= 6) {
      await db.execute(
        sql`UPDATE auth.users
            SET encrypted_password = crypt(${password.trim()}, gen_salt('bf')),
                raw_user_meta_data = raw_user_meta_data || ${JSON.stringify({ full_name: fullName, role })}::jsonb,
                updated_at = now()
            WHERE id = ${userId}::uuid`
      );
    }

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update staff member.' };
  }
}

/**
 * Deletes a staff member from the clinic.
 */
export async function deleteStaffUserAction(targetUserId: string): Promise<StaffActionResult> {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    return { error: 'Forbidden: Only clinic owners can remove staff members.' };
  }

  if (user.id === targetUserId) {
    return { error: 'You cannot remove your own account.' };
  }

  try {
    // 1. Delete from public.users
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .delete(users)
        .where(and(eq(users.id, targetUserId), eq(users.clinicId, clinicId)));
    });

    // 2. Delete from auth.users
    await db.execute(
      sql`DELETE FROM auth.users WHERE id = ${targetUserId}::uuid`
    );

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to remove staff member.' };
  }
}

export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    throw new Error('Forbidden: Only clinic owners can update staff roles.');
  }

  const parsed = updateRoleSchema.safeParse({ userId, role: newRole });
  if (!parsed.success) {
    throw new Error('Invalid role or user ID.');
  }

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
