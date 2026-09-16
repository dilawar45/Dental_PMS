'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, consents } from '@dental-pms/db/schema';
import { CONSENT_DEFINITIONS } from '@/lib/constants/consents';
import { logAudit } from '@/lib/audit';
import { eq, and, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const updatePatientSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters'),
  phone: z
    .string()
    .trim()
    .regex(
      /^\+92[0-9]{10}$/,
      'Phone number must be formatted as +92XXXXXXXXXX (10 digits after +92)'
    ),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  dob: z.string().optional().or(z.literal('')),
  gender: z.enum(['male', 'female', 'other']).optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
  notes: z.string().trim().optional().or(z.literal('')),
  consents: z.object({
    data_processing: z
      .boolean()
      .refine(
        (val) => val === true,
        'Data processing consent is required to maintain a patient profile.'
      ),
    reminders: z.boolean(),
    marketing: z.boolean(),
  }),
});

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function updatePatientAction(
  patientId: string,
  rawInput: UpdatePatientInput
): Promise<ActionResult<{ patientId: string }>> {
  const { user } = await requireUser();

  const parsed = updatePatientSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join('.');
      fieldErrors[path] = issue.message;
    }
    return {
      success: false,
      error: 'Validation failed. Please review the highlighted fields.',
      fieldErrors,
    };
  }

  const input = parsed.data;

  // Resolve client IP
  const headerList = await headers();
  const rawIp =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';
  const clientIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-fA-F0-9:]+$/.test(rawIp)
    ? rawIp
    : '127.0.0.1';

  try {
    await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      // 1. Fetch current patient
      const [existingPatient] = await tx
        .select()
        .from(patients)
        .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

      if (!existingPatient) {
        throw new Error('Patient not found');
      }

      // 2. Compute demographics diff
      const diff: Record<string, { before: unknown; after: unknown }> = {};
      const fieldsToCheck = [
        'fullName',
        'phone',
        'email',
        'dob',
        'gender',
        'address',
        'notes',
      ] as const;

      for (const field of fieldsToCheck) {
        const beforeVal = existingPatient[field] ?? '';
        const afterVal = input[field] ?? '';
        if (beforeVal !== afterVal) {
          diff[field] = { before: beforeVal, after: afterVal };
        }
      }

      // 3. Update patient row
      await tx
        .update(patients)
        .set({
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          dob: input.dob || null,
          gender: input.gender || null,
          address: input.address || null,
          notes: input.notes || null,
          updatedAt: new Date(),
        })
        .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

      // 4. Log demographics update if anything changed
      if (Object.keys(diff).length > 0) {
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'patient.update',
          entity: 'patient',
          entityId: patientId,
          meta: { diff },
        });
      }

      // 5. Diff and update consents
      const activeConsents = await tx
        .select()
        .from(consents)
        .where(
          and(
            eq(consents.patientId, patientId),
            eq(consents.clinicId, user.clinicId),
            isNull(consents.revokedAt)
          )
        );

      const activeTypes = new Map(activeConsents.map((c) => [c.type, c]));
      const consentCategories: Array<'data_processing' | 'reminders' | 'marketing'> = [
        'data_processing',
        'reminders',
        'marketing',
      ];

      for (const cat of consentCategories) {
        const isDesired = input.consents[cat];
        const currentlyActive = activeTypes.get(cat);

        if (currentlyActive && !isDesired) {
          // Revoke consent
          const revokedAt = new Date();
          await tx
            .update(consents)
            .set({ revokedAt })
            .where(eq(consents.id, currentlyActive.id));

          await logAudit(tx, {
            clinicId: user.clinicId,
            actorId: user.id,
            action: 'consent.revoke',
            entity: 'consent',
            entityId: currentlyActive.id,
            meta: { patientId, type: cat, revokedAt: revokedAt.toISOString() },
          });
        } else if (!currentlyActive && isDesired) {
          // Grant new consent
          const def = CONSENT_DEFINITIONS[cat];
          const [newConsent] = await tx
            .insert(consents)
            .values({
              clinicId: user.clinicId,
              patientId,
              type: cat,
              version: def.version,
              textSnapshot: def.fullSnapshotText,
              ip: clientIp,
              grantedAt: new Date(),
            })
            .returning();

          if (newConsent) {
            await logAudit(tx, {
              clinicId: user.clinicId,
              actorId: user.id,
              action: 'consent.grant',
              entity: 'consent',
              entityId: newConsent.id,
              meta: { patientId, type: cat, version: def.version, ip: clientIp },
            });
          }
        }
      }
    });

    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/patients');
    return { success: true, data: { patientId } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update patient profile',
    };
  }
}
