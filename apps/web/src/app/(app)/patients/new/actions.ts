'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, consents } from '@dental-pms/db/schema';
import { CONSENT_DEFINITIONS } from '@/lib/constants/consents';
import { logAudit } from '@/lib/audit';
import { headers } from 'next/headers';
import { z } from 'zod';

const createPatientSchema = z.object({
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
        'Data processing consent is required to create a patient profile.'
      ),
    reminders: z.boolean(),
    marketing: z.boolean(),
  }),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string> };

export async function createPatientAction(
  rawInput: CreatePatientInput
): Promise<ActionResult<{ patientId: string }>> {
  const { user } = await requireUser();

  const parsed = createPatientSchema.safeParse(rawInput);
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

  // Resolve client IP address from proxy headers
  const headerList = await headers();
  const rawIp =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';

  // Sanitize IP for postgres inet type (fallback to 127.0.0.1 if invalid)
  const clientIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-fA-F0-9:]+$/.test(rawIp)
    ? rawIp
    : '127.0.0.1';

  try {
    const result = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      // 1. Insert patient record
      const [newPatient] = await tx
        .insert(patients)
        .values({
          clinicId: user.clinicId,
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          dob: input.dob || null,
          gender: input.gender || null,
          address: input.address || null,
          notes: input.notes || null,
        })
        .returning();

      if (!newPatient) {
        throw new Error('Failed to create patient row');
      }

      // 2. Insert consent records
      const consentKeys: Array<'data_processing' | 'reminders' | 'marketing'> = [
        'data_processing',
        'reminders',
        'marketing',
      ];

      const grantedTypes: string[] = [];

      for (const key of consentKeys) {
        if (input.consents[key]) {
          const def = CONSENT_DEFINITIONS[key];
          const [newConsent] = await tx
            .insert(consents)
            .values({
              clinicId: user.clinicId,
              patientId: newPatient.id,
              type: key,
              version: def.version,
              textSnapshot: def.fullSnapshotText,
              ip: clientIp,
              grantedAt: new Date(),
            })
            .returning();

          if (newConsent) {
            grantedTypes.push(key);
            await logAudit(tx, {
              clinicId: user.clinicId,
              actorId: user.id,
              action: 'consent.grant',
              entity: 'consent',
              entityId: newConsent.id,
              meta: {
                patientId: newPatient.id,
                consentType: key,
                version: def.version,
                ip: clientIp,
              },
            });
          }
        }
      }

      // 3. Log patient.create audit entry
      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'patient.create',
        entity: 'patient',
        entityId: newPatient.id,
        meta: {
          fullName: newPatient.fullName,
          phone: newPatient.phone,
          email: newPatient.email,
          dob: newPatient.dob,
          gender: newPatient.gender,
          grantedConsents: grantedTypes,
        },
      });

      return { patientId: newPatient.id };
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An error occurred creating the patient.',
    };
  }
}
