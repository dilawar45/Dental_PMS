'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import type { UserRole } from '@dental-pms/types';
import { eq, and, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const phoneRegex = /^\+?[0-9]{10,18}$/;

const createStaffSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(25, 'Full name cannot exceed 25 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address for staff login')
    .max(35, 'Email cannot exceed 35 characters'),
  qualification: z
    .string()
    .trim()
    .max(100, 'Qualification cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Phone number must be digits only (10 to 18 digits)'),
  address: z
    .string()
    .trim()
    .max(100, 'Address cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
  password: z
    .string()
    .min(8, 'Initial password must be at least 8 characters')
    .max(12, 'Initial password cannot exceed 12 characters'),
});

const updateStaffSchema = z.object({
  userId: z.string().uuid(),
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(25, 'Full name cannot exceed 25 characters'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address for staff login')
    .max(35, 'Email cannot exceed 35 characters'),
  qualification: z
    .string()
    .trim()
    .max(100, 'Qualification cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Phone number must be digits only (10 to 18 digits)'),
  address: z
    .string()
    .trim()
    .max(100, 'Address cannot exceed 100 characters')
    .optional()
    .or(z.literal('')),
  role: z.enum(['owner', 'dentist', 'receptionist', 'assistant']),
  password: z
    .string()
    .min(8, 'Password must be between 8 and 12 characters')
    .max(12, 'Password must be between 8 and 12 characters')
    .optional()
    .or(z.literal('')),
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
 * Creates a new staff member account in auth.users & public.users.
 * Sets must_change_password: true so the user is forced to set their private password on 1st login.
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
    // 1. Check if user already exists in public.users
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existing) {
      return { error: `A staff member with email "${normalizedEmail}" is already registered.` };
    }

    // 2. Check if user exists in auth.users
    const existingAuth = await db.execute(
      sql`SELECT id FROM auth.users WHERE email = ${normalizedEmail} LIMIT 1`
    );

    let authUserId: string;

    const userMetadata = {
      full_name: fullName,
      role,
      clinic_id: clinicId,
      must_change_password: true,
    };

    if (existingAuth.length > 0 && existingAuth[0]?.['id']) {
      // User exists in auth.users, update password & metadata
      authUserId = existingAuth[0]['id'] as string;
      await db.execute(
        sql`UPDATE auth.users
            SET encrypted_password = crypt(${password}, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                raw_user_meta_data = ${JSON.stringify(userMetadata)}::jsonb,
                updated_at = now()
            WHERE id = ${authUserId}::uuid`
      );
    } else {
      // Insert new user into auth.users safely
      const insertedAuth = await db.execute(
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
              ${JSON.stringify(userMetadata)}::jsonb,
              now(),
              now(),
              'authenticated',
              'authenticated',
              '', '', '', '', '', '', '', ''
            )
            RETURNING id`
      );
      authUserId = insertedAuth[0]?.['id'] as string;
    }

    if (!authUserId) {
      return { error: 'Failed to provision staff authentication account.' };
    }

    // 3. Insert or update public.users with must_change_password: true
    // onConflictDoUpdate prevents duplicate key errors if the auth trigger already inserted the ID
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .insert(users)
        .values({
          id: authUserId,
          clinicId,
          email: normalizedEmail,
          fullName,
          qualification: qualification || null,
          phone,
          address: address || null,
          role,
          active: true,
          mustChangePassword: true,
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            clinicId,
            email: normalizedEmail,
            fullName,
            qualification: qualification || null,
            phone,
            address: address || null,
            role,
            active: true,
            mustChangePassword: true,
            updatedAt: new Date(),
          },
        });
    });

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to add staff member.' };
  }
}

/**
 * Updates an existing staff member's profile, qualification, contact, email, and role.
 */
export async function updateStaffUserAction(formData: FormData): Promise<StaffActionResult> {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    return { error: 'Forbidden: Only clinic owners can update staff profiles.' };
  }

  const raw = {
    userId: formData.get('userId'),
    fullName: formData.get('fullName'),
    email: formData.get('email'),
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

  const { userId, fullName, email, qualification, phone, address, role, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Prevent self-demotion from owner role
  if (user.id === userId && role !== 'owner') {
    return { error: 'You cannot change your own role away from Owner.' };
  }

  try {
    // 1. Check if the updated email is already in use by another user
    const [existingEmailUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail));

    if (existingEmailUser && existingEmailUser.id !== userId) {
      return { error: `The email "${normalizedEmail}" is already used by another staff member.` };
    }

    // 2. Update public.users
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .update(users)
        .set({
          fullName,
          email: normalizedEmail,
          qualification: qualification || null,
          phone,
          address: address || null,
          role,
          updatedAt: new Date(),
        })
        .where(and(eq(users.id, userId), eq(users.clinicId, clinicId)));
    });

    // 3. Update auth.users email and metadata
    const userMetadata = {
      full_name: fullName,
      role,
      clinic_id: clinicId,
    };

    await db.execute(
      sql`UPDATE auth.users
          SET email = ${normalizedEmail},
              raw_user_meta_data = raw_user_meta_data || ${JSON.stringify(userMetadata)}::jsonb,
              updated_at = now()
          WHERE id = ${userId}::uuid`
    );

    // 4. If temporary password reset provided by owner, set mustChangePassword: true
    if (password && password.trim().length >= 8) {
      await db.execute(
        sql`UPDATE auth.users
            SET encrypted_password = crypt(${password.trim()}, gen_salt('bf')),
                raw_user_meta_data = raw_user_meta_data || ${JSON.stringify({ full_name: fullName, role, must_change_password: true })}::jsonb,
                updated_at = now()
            WHERE id = ${userId}::uuid`
      );

      await withClinic(db, clinicId, async (tx) => {
        await tx
          .update(users)
          .set({ mustChangePassword: true })
          .where(eq(users.id, userId));
      });
    }

    revalidatePath('/settings/users');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update staff member.' };
  }
}

/**
 * Removes a staff member from the clinic roster and auth.
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

/**
 * Action for a staff member to set their own private password (clearing must_change_password flag).
 */
export async function completeFirstLoginPasswordChangeAction(newPassword: string): Promise<StaffActionResult> {
  const { user } = await requireUser();

  if (newPassword.length < 8 || newPassword.length > 12) {
    return { error: 'Password must be between 8 and 12 characters.' };
  }

  try {
    await db.execute(
      sql`UPDATE auth.users
          SET encrypted_password = crypt(${newPassword}, gen_salt('bf')),
              raw_user_meta_data = raw_user_meta_data || '{"must_change_password": false}'::jsonb,
              updated_at = now()
          WHERE id = ${user.id}::uuid`
    );

    await db
      .update(users)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, user.id));

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to update password.' };
  }
}
