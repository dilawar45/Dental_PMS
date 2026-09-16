'use server';

import { requireRole, requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import {
  chartingEntries,
  patients,
  clinics,
  files,
  users,
} from '@dental-pms/db/schema';
import { logAudit } from '@/lib/audit';
import { getPdfProvider } from '@dental-pms/integrations/pdf';
import { getStorageProvider } from '@dental-pms/integrations/storage';
import { eq, and, asc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const toothFdiRegex = /^[1-8][1-8]$/;

const toothSurfaceEnumSchema = z.enum([
  'mesial',
  'distal',
  'buccal',
  'lingual',
  'occlusal',
  'incisal',
  'whole',
]);

const toothConditionEnumSchema = z.enum([
  'healthy',
  'caries',
  'filled',
  'crown',
  'missing',
  'implant',
  'rct',
]);

const recordEntrySchema = z.object({
  patientId: z.string().uuid(),
  toothFdi: z.string().regex(toothFdiRegex, 'Invalid FDI tooth number (e.g. 11-48, 51-85)'),
  surface: toothSurfaceEnumSchema,
  condition: toothConditionEnumSchema,
  notes: z.string().max(1000).optional().nullable(),
});

const recordBatchSchema = z.object({
  patientId: z.string().uuid(),
  entries: z.array(
    z.object({
      toothFdi: z.string().regex(toothFdiRegex),
      surface: toothSurfaceEnumSchema,
      condition: toothConditionEnumSchema,
      notes: z.string().max(1000).optional().nullable(),
    })
  ).min(1, 'At least one tooth entry is required'),
});

export type RecordEntryInput = z.infer<typeof recordEntrySchema>;
export type RecordBatchInput = z.infer<typeof recordBatchSchema>;

/**
 * Appends a new charting entry (condition on a tooth surface or whole tooth).
 * Strictly restricted to Dentist and Owner roles.
 */
export async function recordChartingEntryAction(
  rawInput: RecordEntryInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner', 'dentist']);

  const parsed = recordEntrySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid charting entry data',
    };
  }

  const { patientId, toothFdi, surface, condition, notes } = parsed.data;

  try {
    const created = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // Verify patient belongs to clinic
        const [pat] = await tx
          .select()
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!pat) {
          throw new Error('Patient not found');
        }

        const [entry] = await tx
          .insert(chartingEntries)
          .values({
            clinicId: user.clinicId,
            patientId,
            toothFdi,
            surface,
            condition,
            notes: notes?.trim() || null,
            recordedBy: user.id,
            recordedAt: new Date(),
          })
          .returning();

        if (!entry) {
          throw new Error('Failed to insert charting entry');
        }

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'charting.entry_created',
          entity: 'charting_entry',
          entityId: entry.id,
          meta: {
            patientId,
            toothFdi,
            surface,
            condition,
            notes: notes?.trim() || null,
          },
        });

        return { id: entry.id };
      }
    );

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record charting entry',
    };
  }
}

/**
 * Appends multiple charting entries in a single batch (e.g., multi-tooth condition assignment).
 * Strictly restricted to Dentist and Owner roles.
 */
export async function recordBatchChartingEntriesAction(
  rawInput: RecordBatchInput
): Promise<ActionResult<{ count: number }>> {
  const { user } = await requireRole(['owner', 'dentist']);

  const parsed = recordBatchSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid batch charting data',
    };
  }

  const { patientId, entries } = parsed.data;

  try {
    const result = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const [pat] = await tx
          .select()
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!pat) {
          throw new Error('Patient not found');
        }

        const now = new Date();
        const rowsToInsert = entries.map((e) => ({
          clinicId: user.clinicId,
          patientId,
          toothFdi: e.toothFdi,
          surface: e.surface,
          condition: e.condition,
          notes: e.notes?.trim() || null,
          recordedBy: user.id,
          recordedAt: now,
        }));

        const inserted = await tx
          .insert(chartingEntries)
          .values(rowsToInsert)
          .returning();

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'charting.batch_created',
          entity: 'charting_entry',
          meta: {
            patientId,
            count: inserted.length,
            teeth: entries.map((e) => `${e.toothFdi}:${e.surface}:${e.condition}`),
          },
        });

        return { count: inserted.length };
      }
    );

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record batch charting entries',
    };
  }
}

/**
 * Generates an exportable PDF of the patient's dental chart.
 * Accessible to all clinic staff roles.
 */
export async function exportChartPdfAction(
  patientId: string
): Promise<ActionResult<{ storageKey: string; fileId: string }>> {
  const { user } = await requireUser();

  try {
    const exported = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const [pat] = await tx
          .select()
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!pat) {
          throw new Error('Patient not found');
        }

        const [cln] = await tx
          .select()
          .from(clinics)
          .where(eq(clinics.id, user.clinicId));

        const chartHistory = await tx
          .select({
            id: chartingEntries.id,
            toothFdi: chartingEntries.toothFdi,
            surface: chartingEntries.surface,
            condition: chartingEntries.condition,
            notes: chartingEntries.notes,
            recordedAt: chartingEntries.recordedAt,
            practitionerName: users.fullName,
          })
          .from(chartingEntries)
          .leftJoin(users, eq(chartingEntries.recordedBy, users.id))
          .where(
            and(
              eq(chartingEntries.clinicId, user.clinicId),
              eq(chartingEntries.patientId, patientId)
            )
          )
          .orderBy(asc(chartingEntries.recordedAt));

        const pdfPayload = {
          patient: {
            id: pat.id,
            fullName: pat.fullName,
            phone: pat.phone,
            email: pat.email,
            dob: pat.dob,
            gender: pat.gender,
          },
          clinic: {
            name: cln?.name ?? 'Bright Smile Dental Clinic',
            phone: cln?.phone ?? '',
            address: cln?.address ?? '',
          },
          chartEntries: chartHistory,
          generatedAt: new Date().toISOString(),
          generatedBy: user.fullName,
        };

        const pdfProvider = getPdfProvider(db);
        const pdfBuffer = await pdfProvider.generate('dental_chart', pdfPayload);

        const storageProvider = getStorageProvider(db);
        const destinationKey = `${user.clinicId}/charts/${pat.id}_chart_${Date.now()}.pdf`;
        await storageProvider.upload('documents', destinationKey, pdfBuffer);

        const [fileRecord] = await tx
          .insert(files)
          .values({
            clinicId: user.clinicId,
            patientId: pat.id,
            kind: 'document',
            storageKey: destinationKey,
            mime: 'application/pdf',
            size: pdfBuffer.length,
            uploadedBy: user.id,
            uploadedAt: new Date(),
          })
          .returning();

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'charting.pdf_exported',
          entity: 'patient',
          entityId: pat.id,
          meta: {
            storageKey: destinationKey,
            fileId: fileRecord?.id,
            sizeBytes: pdfBuffer.length,
          },
        });

        return {
          storageKey: destinationKey,
          fileId: fileRecord?.id ?? '',
        };
      }
    );

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: exported };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to export dental chart PDF',
    };
  }
}
