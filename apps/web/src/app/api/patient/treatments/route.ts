import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { treatments } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const treatmentList = await withClinic(auth.clinic_id, async (tx) => {
      return await tx
        .select({
          id: treatments.id,
          procedure_code: treatments.procedureCode,
          tooth_fdi: treatments.toothFdi,
          cost: treatments.cost,
          notes: treatments.notes,
          created_at: treatments.createdAt,
        })
        .from(treatments)
        .where(
          and(
            eq(treatments.clinicId, auth.clinic_id),
            eq(treatments.patientId, auth.patient_id)
          )
        )
        .orderBy(desc(treatments.createdAt));
    });

    return withCors(NextResponse.json({ treatments: treatmentList }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
