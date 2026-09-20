import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { bookingRequests, patients } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const createBookingSchema = z.object({
  slot_start: z.string().datetime({ message: 'slot_start must be an ISO datetime string' }),
  slot_end: z.string().datetime({ message: 'slot_end must be an ISO datetime string' }),
  dentist_id: z.string().uuid('Invalid dentist ID').optional(),
  reason: z.string().trim().min(1, 'Reason for visit is required'),
  notes: z.string().trim().optional(),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const auth = requirePatient(req);
    const body = await req.json();
    const parsed = createBookingSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { slot_start, slot_end, dentist_id, reason, notes } = parsed.data;

    const result = await withClinic(auth.clinic_id, async (tx) => {
      // 1. Fetch patient details
      const [patient] = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
        })
        .from(patients)
        .where(eq(patients.id, auth.patient_id))
        .limit(1);

      if (!patient) {
        throw new Error('Patient record not found');
      }

      // 2. Format notes with requested dentist if specified
      let combinedNotes = notes || '';
      if (dentist_id) {
        combinedNotes = combinedNotes
          ? `[Preferred Dentist: ${dentist_id}] ${combinedNotes}`
          : `[Preferred Dentist: ${dentist_id}]`;
      }

      // 3. Create booking request
      const [booking] = await tx
        .insert(bookingRequests)
        .values({
          clinicId: auth.clinic_id,
          patientId: patient.id,
          patientName: patient.fullName,
          patientPhone: patient.phone,
          requestedSlotStart: new Date(slot_start),
          requestedSlotEnd: new Date(slot_end),
          reason,
          notes: combinedNotes || null,
          status: 'pending',
          requestedVia: 'patient_app',
        })
        .returning();

      if (!booking) {
        throw new Error('Failed to create booking request');
      }

      // 4. Log audit trail
      await logAudit(tx, {
        clinicId: auth.clinic_id,
        actorId: null,
        action: 'booking_request.create',
        entity: 'booking_request',
        entityId: booking.id,
        meta: {
          actor_type: 'patient',
          patient_id: patient.id,
          requested_slot_start: slot_start,
          requested_slot_end: slot_end,
        },
      });

      return booking;
    });

    return withCors(
      NextResponse.json(
        {
          booking_request_id: result.id,
          status: result.status,
          message:
            'Booking request received. Our clinic staff will review and confirm your appointment.',
        },
        { status: 201 }
      ),
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
