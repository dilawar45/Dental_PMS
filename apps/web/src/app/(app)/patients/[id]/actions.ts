'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { patients, consents, files, type fileKindEnum } from '@dental-pms/db/schema';
import { getStorageProvider } from '@dental-pms/integrations/storage';
import { CONSENT_DEFINITIONS } from '@/lib/constants/consents';
import { logAudit } from '@/lib/audit';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Soft-delete / archive patient record.
 */
export async function archivePatientAction(
  patientId: string
): Promise<ActionResult<{ archivedAt: string }>> {
  const { user } = await requireUser();

  try {
    const archivedAt = new Date();
    await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [updated] = await tx
        .update(patients)
        .set({ deletedAt: archivedAt })
        .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)))
        .returning();

      if (!updated) {
        throw new Error('Patient not found or already deleted');
      }

      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'patient.archive',
        entity: 'patient',
        entityId: patientId,
        meta: {
          fullName: updated.fullName,
          archivedAt: archivedAt.toISOString(),
        },
      });
    });

    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/patients');
    return { success: true, data: { archivedAt: archivedAt.toISOString() } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to archive patient',
    };
  }
}

/**
 * Restore an archived patient record.
 */
export async function restorePatientAction(
  patientId: string
): Promise<ActionResult<void>> {
  const { user } = await requireUser();

  try {
    await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [updated] = await tx
        .update(patients)
        .set({ deletedAt: null })
        .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)))
        .returning();

      if (!updated) {
        throw new Error('Patient not found');
      }

      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'patient.restore',
        entity: 'patient',
        entityId: patientId,
        meta: {
          fullName: updated.fullName,
          restoredAt: new Date().toISOString(),
        },
      });
    });

    revalidatePath(`/patients/${patientId}`);
    revalidatePath('/patients');
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to restore patient',
    };
  }
}

/**
 * Revoke an active patient consent.
 */
export async function revokeConsentAction(
  consentId: string,
  patientId: string
): Promise<ActionResult<void>> {
  const { user } = await requireUser();

  try {
    const revokedAt = new Date();
    await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [updated] = await tx
        .update(consents)
        .set({ revokedAt })
        .where(
          and(
            eq(consents.id, consentId),
            eq(consents.patientId, patientId),
            eq(consents.clinicId, user.clinicId)
          )
        )
        .returning();

      if (!updated) {
        throw new Error('Consent record not found');
      }

      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'consent.revoke',
        entity: 'consent',
        entityId: consentId,
        meta: {
          patientId,
          type: updated.type,
          revokedAt: revokedAt.toISOString(),
        },
      });
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to revoke consent',
    };
  }
}

/**
 * Grant a new consent category for this patient.
 */
export async function grantConsentAction(
  patientId: string,
  consentType: 'data_processing' | 'reminders' | 'marketing'
): Promise<ActionResult<{ consentId: string }>> {
  const { user } = await requireUser();

  const headerList = await headers();
  const rawIp =
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    '127.0.0.1';
  const clientIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^[a-fA-F0-9:]+$/.test(rawIp)
    ? rawIp
    : '127.0.0.1';

  try {
    const def = CONSENT_DEFINITIONS[consentType];
    const result = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [newConsent] = await tx
        .insert(consents)
        .values({
          clinicId: user.clinicId,
          patientId,
          type: consentType,
          version: def.version,
          textSnapshot: def.fullSnapshotText,
          ip: clientIp,
          grantedAt: new Date(),
        })
        .returning();

      if (!newConsent) {
        throw new Error('Failed to create consent record');
      }

      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'consent.grant',
        entity: 'consent',
        entityId: newConsent.id,
        meta: {
          patientId,
          type: consentType,
          version: def.version,
          ip: clientIp,
        },
      });

      return { consentId: newConsent.id };
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: result };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to grant consent',
    };
  }
}

/**
 * Upload a clinical or media asset file for a patient.
 */
export async function uploadPatientFileAction(
  formData: FormData
): Promise<ActionResult<{ fileId: string; url: string }>> {
  const { user } = await requireUser();

  const file = formData.get('file') as File | null;
  const patientId = formData.get('patientId') as string | null;
  const kind = formData.get('kind') as 'xray' | 'photo' | 'document' | 'receipt' | null;

  if (!file || !patientId || !kind) {
    return { success: false, error: 'Missing required upload parameters' };
  }

  // Validate size: max 25MB
  const maxSizeBytes = 25 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { success: false, error: 'File size exceeds maximum allowed limit of 25MB' };
  }

  // Validate MIME type: image/* or application/pdf
  if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
    return { success: false, error: 'Unsupported file format. Please upload an image or PDF.' };
  }

  const validKinds = ['xray', 'photo', 'document', 'receipt'];
  if (!validKinds.includes(kind)) {
    return { success: false, error: 'Invalid file category kind selected' };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `patients/${patientId}/${Date.now()}_${sanitizedName}`;

    // Upload via storage provider interface
    const storage = getStorageProvider(db);
    const { url } = await storage.upload('patient-files', storageKey, buffer);

    // Save metadata in database within tenant transaction
    const newFileRecord = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [inserted] = await tx
        .insert(files)
        .values({
          clinicId: user.clinicId,
          patientId,
          kind,
          storageKey,
          mime: file.type,
          size: file.size,
          uploadedBy: user.id,
          uploadedAt: new Date(),
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to record file metadata in database');
      }

      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'file.upload',
        entity: 'file',
        entityId: inserted.id,
        meta: {
          patientId,
          fileName: file.name,
          mime: file.type,
          size: file.size,
          kind,
          storageKey,
        },
      });

      return inserted;
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: { fileId: newFileRecord.id, url } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'File upload failed',
    };
  }
}

/**
 * Hard-delete a patient asset file from storage and database.
 */
export async function deletePatientFileAction(
  fileId: string,
  patientId: string
): Promise<ActionResult<void>> {
  const { user } = await requireUser();

  try {
    await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      // Find file
      const [fileRecord] = await tx
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, fileId),
            eq(files.patientId, patientId),
            eq(files.clinicId, user.clinicId)
          )
        );

      if (!fileRecord) {
        throw new Error('File not found or already deleted');
      }

      // Delete from DB
      await tx
        .delete(files)
        .where(and(eq(files.id, fileId), eq(files.clinicId, user.clinicId)));

      // Delete from storage provider
      const storage = getStorageProvider(db);
      await storage.delete('patient-files', fileRecord.storageKey);

      // Audit log
      await logAudit(tx, {
        clinicId: user.clinicId,
        actorId: user.id,
        action: 'file.delete',
        entity: 'file',
        entityId: fileId,
        meta: {
          patientId,
          storageKey: fileRecord.storageKey,
          mime: fileRecord.mime,
        },
      });
    });

    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: undefined };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete file',
    };
  }
}
