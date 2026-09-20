import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { patients } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const profile = await withClinic(auth.clinic_id, async (tx) => {
      const [p] = await tx
        .select({
          id: patients.id,
          full_name: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          dob: patients.dob,
          gender: patients.gender,
          address: patients.address,
          preferred_language: patients.preferredLanguage,
          clinic_id: patients.clinicId,
        })
        .from(patients)
        .where(eq(patients.id, auth.patient_id))
        .limit(1);

      return p;
    });

    if (!profile) {
      return withCors(
        NextResponse.json({ error: 'Patient not found' }, { status: 404 }),
        req
      );
    }

    return withCors(NextResponse.json(profile), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).optional(),
  email: z.string().email().optional().nullable(),
  address: z.string().trim().optional().nullable(),
  preferred_language: z.string().trim().min(2).max(10).optional(),
});

export async function PATCH(req: Request) {
  try {
    const auth = requirePatient(req);
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const updates: Partial<{
      fullName: string;
      email: string | null;
      address: string | null;
      preferredLanguage: string;
    }> = {};

    if (parsed.data.full_name !== undefined) updates.fullName = parsed.data.full_name;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.preferred_language !== undefined) {
      updates.preferredLanguage = parsed.data.preferred_language;
    }

    if (Object.keys(updates).length === 0) {
      return withCors(
        NextResponse.json({ error: 'No fields provided for update' }, { status: 400 }),
        req
      );
    }

    const updated = await withClinic(auth.clinic_id, async (tx) => {
      const [res] = await tx
        .update(patients)
        .set(updates)
        .where(eq(patients.id, auth.patient_id))
        .returning({
          id: patients.id,
          full_name: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          dob: patients.dob,
          gender: patients.gender,
          address: patients.address,
          preferred_language: patients.preferredLanguage,
          clinic_id: patients.clinicId,
        });

      if (res) {
        await logAudit(tx, {
          clinicId: auth.clinic_id,
          actorId: null,
          action: 'patient.update',
          entity: 'patient',
          entityId: auth.patient_id,
          meta: {
            actor_type: 'patient',
            patient_id: auth.patient_id,
            updated_fields: Object.keys(updates),
          },
        });
      }

      return res;
    });

    if (!updated) {
      return withCors(
        NextResponse.json({ error: 'Patient not found' }, { status: 404 }),
        req
      );
    }

    return withCors(NextResponse.json(updated), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
