import { NextResponse } from 'next/server';
import { and, eq, inArray } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const doctors = await withClinic(auth.clinic_id, async (tx) => {
      const staffList = await tx
        .select({
          id: users.id,
          fullName: users.fullName,
          role: users.role,
        })
        .from(users)
        .where(
          and(
            eq(users.clinicId, auth.clinic_id),
            inArray(users.role, ['dentist', 'owner'])
          )
        );

      return staffList.map((doc) => ({
        id: doc.id,
        full_name: doc.fullName,
        role: doc.role,
        // Fee in PKR — future enhancement: read from clinic_services table
        fee: 2000,
        fee_currency: 'PKR',
        // Weekly schedule — future enhancement: read from doctor_working_hours table
        weekly_schedule: 'Mon-Sat 09:00-19:00',
      }));
    });

    return withCors(NextResponse.json({ doctors }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
