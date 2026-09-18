'use server';

import crypto from 'node:crypto';
import { db } from '@/lib/db';
import { clinics, users, clinicInvites } from '@dental-pms/db/schema';
import { logPlatformAudit } from '@/lib/platform-audit';
import { eq, sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const acceptInviteSchema = z.object({
  token: z.string().min(10),
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function acceptInviteAction(
  rawInput: z.infer<typeof acceptInviteSchema>
): Promise<{ success: boolean; error?: string }> {
  const parsed = acceptInviteSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid input' };
  }

  const { token, fullName, password } = parsed.data;

  try {
    // 1. Validate invite
    const [invite] = await db
      .select()
      .from(clinicInvites)
      .where(eq(clinicInvites.token, token));

    if (!invite) {
      return { success: false, error: 'Invalid invitation link.' };
    }

    if (invite.acceptedAt) {
      return { success: false, error: 'This invitation has already been accepted.' };
    }

    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'This invitation has expired. Please contact support.' };
    }

    // 2. Fetch associated clinic
    const [clinic] = await db
      .select()
      .from(clinics)
      .where(eq(clinics.id, invite.clinicId));

    if (!clinic) {
      return { success: false, error: 'Clinic associated with this invite not found.' };
    }

    const email = invite.email.toLowerCase().trim();

    // 3. Upsert into auth.users using postgres crypt
    const existingAuth = await db.execute(
      sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`
    );

    const metaJson = JSON.stringify({
      full_name: fullName,
      role: invite.role,
    });

    let authUserId: string;

    if (existingAuth.length > 0 && existingAuth[0]?.['id']) {
      authUserId = existingAuth[0]['id'] as string;
      await db.execute(
        sql`UPDATE auth.users
            SET encrypted_password = crypt(${password}, gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                raw_user_meta_data = ${metaJson}::jsonb,
                raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
                updated_at = now()
            WHERE id = ${authUserId}`
      );
    } else {
      authUserId = crypto.randomUUID();
      await db.execute(
        sql`INSERT INTO auth.users (
              instance_id, id, aud, role, email, encrypted_password,
              email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
              created_at, updated_at
            ) VALUES (
              '00000000-0000-0000-0000-000000000000',
              ${authUserId}::uuid,
              'authenticated',
              'authenticated',
              ${email},
              crypt(${password}, gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              ${metaJson}::jsonb,
              now(),
              now()
            )`
      );
    }

    // 4. Upsert into public.users
    await db
      .insert(users)
      .values({
        id: authUserId,
        clinicId: clinic.id,
        email,
        fullName,
        role: invite.role,
        active: true,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          clinicId: clinic.id,
          fullName,
          role: invite.role,
          active: true,
          updatedAt: new Date(),
        },
      });

    // 5. Mark invite accepted
    await db
      .update(clinicInvites)
      .set({ acceptedAt: new Date() })
      .where(eq(clinicInvites.id, invite.id));

    // 6. Update clinic status to 'active'
    await db
      .update(clinics)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(clinics.id, clinic.id));

    // 7. Log invite.accepted in platform_audit_log
    await logPlatformAudit({
      actorId: authUserId,
      action: 'invite.accepted',
      targetClinicId: clinic.id,
      meta: {
        email,
        role: invite.role,
        userId: authUserId,
        clinicName: clinic.name,
      },
    });

    // 8. Sign in the new owner into Supabase session
    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error('Sign-in after accept error:', signInError);
    }

    return { success: true };
  } catch (err) {
    console.error('Accept invite failure:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to accept invitation',
    };
  }
}
