import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { clinics } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const clinic = await withClinic(auth.clinic_id, async (tx) => {
      const [c] = await tx
        .select({
          id: clinics.id,
          name: clinics.name,
          phone: clinics.phone,
          address: clinics.address,
          timezone: clinics.timezone,
        })
        .from(clinics)
        .where(eq(clinics.id, auth.clinic_id))
        .limit(1);

      return c;
    });

    if (!clinic) {
      return withCors(
        NextResponse.json({ error: 'Clinic not found' }, { status: 404 }),
        req
      );
    }

    return withCors(
      NextResponse.json({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        timezone: clinic.timezone || 'Asia/Karachi',
        hours: 'Mon-Sat 09:00-19:00', // Hardcoded operating hours
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
