import { NextResponse } from 'next/server';
import { and, eq, gte, lt, desc, asc } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { appointments, users } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('status') || 'all'; // upcoming | past | all

    const now = new Date();

    const appointmentList = await withClinic(auth.clinic_id, async (tx) => {
      let conditions = [
        eq(appointments.clinicId, auth.clinic_id),
        eq(appointments.patientId, auth.patient_id),
      ];

      if (filter === 'upcoming') {
        conditions.push(gte(appointments.startAt, now));
      } else if (filter === 'past') {
        conditions.push(lt(appointments.endAt, now));
      }

      const rows = await tx
        .select({
          id: appointments.id,
          dentist_id: appointments.dentistId,
          dentist_name: users.fullName,
          status: appointments.status,
          start_at: appointments.startAt,
          end_at: appointments.endAt,
          reason: appointments.reason,
          notes: appointments.notes,
        })
        .from(appointments)
        .leftJoin(users, eq(appointments.dentistId, users.id))
        .where(and(...conditions))
        .orderBy(filter === 'past' ? desc(appointments.startAt) : asc(appointments.startAt));

      return rows;
    });

    return withCors(NextResponse.json({ appointments: appointmentList }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
