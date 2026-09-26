import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { files, patients, users } from '@dental-pms/db/schema';
import { getStorageProvider } from '@dental-pms/integrations/storage';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

/**
 * GET /api/patient/files
 * Retrieves all clinical images, radiographs, and documents for the authenticated patient.
 */
export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);
    const db = getDefaultDb();

    const fileList = await withClinic(auth.clinic_id, async (tx) => {
      return await tx
        .select({
          id: files.id,
          kind: files.kind,
          storageKey: files.storageKey,
          mime: files.mime,
          size: files.size,
          uploadedAt: files.uploadedAt,
          uploaderName: users.fullName,
        })
        .from(files)
        .leftJoin(users, eq(files.uploadedBy, users.id))
        .where(
          and(
            eq(files.clinicId, auth.clinic_id),
            eq(files.patientId, auth.patient_id)
          )
        )
        .orderBy(desc(files.uploadedAt));
    });

    const storage = getStorageProvider(db);

    // Generate signed URLs for patient viewing
    const filesWithUrls = await Promise.all(
      fileList.map(async (file) => {
        try {
          const { url } = await storage.getSignedUrl('patient-files', file.storageKey, 3600);
          return {
            id: file.id,
            kind: file.kind,
            mime: file.mime,
            size: file.size,
            uploaded_at: file.uploadedAt,
            uploader_name: file.uploaderName || 'Self / Patient',
            url,
          };
        } catch {
          return {
            id: file.id,
            kind: file.kind,
            mime: file.mime,
            size: file.size,
            uploaded_at: file.uploadedAt,
            uploader_name: file.uploaderName || 'Self / Patient',
            url: null,
          };
        }
      })
    );

    return withCors(NextResponse.json({ files: filesWithUrls }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}

/**
 * POST /api/patient/files
 * Allows patient to upload camera photos or gallery images from mobile app.
 */
export async function POST(req: Request) {
  try {
    const auth = requirePatient(req);
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kind = (formData.get('kind') as string) || 'photo';

    if (!file) {
      return withCors(
        NextResponse.json({ error: 'No file provided' }, { status: 400 }),
        req
      );
    }

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      return withCors(
        NextResponse.json({ error: 'Only image files and PDFs are supported' }, { status: 400 }),
        req
      );
    }

    if (file.size > 20 * 1024 * 1024) {
      return withCors(
        NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 }),
        req
      );
    }

    const db = getDefaultDb();
    const storage = getStorageProvider(db);
    const buffer = Buffer.from(await file.arrayBuffer());

    const storageKey = `patients/${auth.patient_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    await storage.upload('patient-files', storageKey, buffer, {
      contentType: file.type,
      upsert: true,
    });

    const insertedFile = await withClinic(auth.clinic_id, async (tx) => {
      const [f] = await tx
        .insert(files)
        .values({
          clinicId: auth.clinic_id,
          patientId: auth.patient_id,
          kind: (kind === 'xray' ? 'xray' : 'photo') as 'xray' | 'photo',
          storageKey,
          mime: file.type,
          size: file.size,
          uploadedBy: null, // uploaded by patient directly
        })
        .returning();

      if (f) {
        await logAudit(tx, {
          clinicId: auth.clinic_id,
          actorId: null,
          action: 'patient.file_upload',
          entity: 'file',
          entityId: f.id,
          meta: {
            actor_type: 'patient',
            patient_id: auth.patient_id,
            storage_key: storageKey,
            mime: file.type,
            size: file.size,
          },
        });
      }

      return f;
    });

    const { url } = await storage.getSignedUrl('patient-files', storageKey, 3600);

    return withCors(
      NextResponse.json({
        success: true,
        file: {
          id: insertedFile.id,
          kind: insertedFile.kind,
          mime: insertedFile.mime,
          size: insertedFile.size,
          uploaded_at: insertedFile.uploadedAt,
          url,
        },
      }),
      req
    );
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
