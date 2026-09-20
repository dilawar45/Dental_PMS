import { NextResponse } from 'next/server';
import { withClinic, getAvailableSlots } from '@dental-pms/db';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);
    const { searchParams } = new URL(req.url);

    const date = searchParams.get('date') || 'today';
    const dentistId = searchParams.get('dentist_id') || undefined;

    const result = await withClinic(auth.clinic_id, async (tx) => {
      return await getAvailableSlots(tx, {
        clinicId: auth.clinic_id,
        date,
        dentistId,
      });
    });

    return withCors(NextResponse.json(result), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
