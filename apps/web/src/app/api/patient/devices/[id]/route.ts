import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { patientDevices } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requirePatient(req);
    const { id: deviceId } = await params;

    await withClinic(auth.clinic_id, async (tx) => {
      await tx
        .delete(patientDevices)
        .where(
          and(
            eq(patientDevices.id, deviceId),
            eq(patientDevices.clinicId, auth.clinic_id),
            eq(patientDevices.patientId, auth.patient_id)
          )
        );
    });

    return withCors(NextResponse.json({ success: true }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
