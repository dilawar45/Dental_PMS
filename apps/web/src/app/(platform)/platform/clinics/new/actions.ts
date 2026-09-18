'use server';

import crypto from 'node:crypto';
import { requireSuperAdmin } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { clinics, clinicInvites } from '@dental-pms/db/schema';
import { logPlatformAudit } from '@/lib/platform-audit';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';

const createClinicSchema = z.object({
  name: z.string().trim().min(2, 'Clinic name must be at least 2 characters'),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must consist of lowercase letters, numbers, and hyphens only'),
  ownerEmail: z.string().trim().email('Valid owner email is required'),
  ownerName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  timezone: z.string().trim().default('Asia/Karachi'),
  locale: z.string().trim().default('en-PK'),
});

export type CreateClinicInput = z.infer<typeof createClinicSchema>;

export type CreateClinicResult =
  | { success: true; clinicId: string; inviteUrl: string; token: string }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function createClinicAction(rawInput: CreateClinicInput): Promise<CreateClinicResult> {
  const context = await requireSuperAdmin();
  const superAdminId = context.user.id;

  const parsed = createClinicSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return {
      success: false,
      error: 'Validation failed. Please review your input.',
      fieldErrors,
    };
  }

  const input = parsed.data;

  // Resolve base URL for invitation link
  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') || 'http';
  const origin = `${proto}://${host}`;

  try {
    const result = await withPlatformAdmin(
      db,
      async (tx) => {
        // 1. Check slug uniqueness
        const [existing] = await tx
          .select({ id: clinics.id })
          .from(clinics)
          .where(eq(clinics.slug, input.slug));

        if (existing) {
          throw new Error(`The slug '${input.slug}' is already taken. Please choose another.`);
        }

        // 2. Insert new clinic with status 'pending'
        const [newClinic] = await tx
          .insert(clinics)
          .values({
            name: input.name,
            slug: input.slug,
            status: 'pending',
            phone: input.phone || null,
            timezone: input.timezone,
            locale: input.locale,
          })
          .returning();

        if (!newClinic) {
          throw new Error('Failed to create clinic row.');
        }

        // 3. Generate secure single-use 72-hour invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

        await tx.insert(clinicInvites).values({
          clinicId: newClinic.id,
          email: input.ownerEmail.toLowerCase(),
          token: inviteToken,
          role: 'owner',
          expiresAt,
        });

        return {
          clinicId: newClinic.id,
          inviteToken,
        };
      },
      { actorId: superAdminId }
    );

    // 4. Log platform events
    await logPlatformAudit({
      actorId: superAdminId,
      action: 'clinic.created',
      targetClinicId: result.clinicId,
      meta: {
        name: input.name,
        slug: input.slug,
        ownerEmail: input.ownerEmail,
      },
    });

    await logPlatformAudit({
      actorId: superAdminId,
      action: 'invite.created',
      targetClinicId: result.clinicId,
      meta: {
        email: input.ownerEmail,
        role: 'owner',
      },
    });

    const inviteUrl = `${origin}/invite/${result.inviteToken}`;

    return {
      success: true,
      clinicId: result.clinicId,
      inviteUrl,
      token: result.inviteToken,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create clinic.',
    };
  }
}
