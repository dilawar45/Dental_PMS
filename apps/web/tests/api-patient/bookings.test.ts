import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST } from '@/app/api/patient/bookings/route';
import {
  createTestClinic,
  createTestPatient,
  createTestDentist,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { bookingRequests, auditLog } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';

describe('POST /api/patient/bookings', () => {
  let clinicId: string;
  let patientId: string;
  let dentistId: string;
  let token: string;

  beforeAll(async () => {
    const clinic = await createTestClinic('Bookings Test Clinic');
    clinicId = clinic.id;
    const patient = await createTestPatient(clinicId, '+923004433221', 'Ayesha Khan');
    patientId = patient.id;
    token = signPatientToken(patientId, clinicId);

    const dentist = await createTestDentist(clinicId, 'Dr. Booking Dentist');
    dentistId = dentist.id;
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('creates booking_request with status=pending and requested_via=patient_app, and logs audit', async () => {
    const slotStart = '2026-10-20T04:00:00.000Z';
    const slotEnd = '2026-10-20T04:30:00.000Z';

    const req = new Request('http://localhost:3000/api/patient/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slot_start: slotStart,
        slot_end: slotEnd,
        dentist_id: dentistId,
        reason: 'Toothache and scaling',
        notes: 'Morning appointment preferred',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);

    const data = (await res.json()) as {
      booking_request_id: string;
      status: string;
      message: string;
    };

    expect(data.booking_request_id).toBeDefined();
    expect(data.status).toBe('pending');

    // Verify row directly in DB
    const [savedBooking] = await testDb
      .select()
      .from(bookingRequests)
      .where(eq(bookingRequests.id, data.booking_request_id))
      .limit(1);

    expect(savedBooking).toBeDefined();
    expect(savedBooking?.requestedVia).toBe('patient_app');
    expect(savedBooking?.patientId).toBe(patientId);
    expect(savedBooking?.status).toBe('pending');

    // Verify audit_log entry
    const [auditEntry] = await testDb
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, data.booking_request_id))
      .limit(1);

    expect(auditEntry).toBeDefined();
    expect(auditEntry?.action).toBe('booking_request.create');
    const meta = auditEntry?.meta as { actor_type?: string; patient_id?: string };
    expect(meta?.actor_type).toBe('patient');
    expect(meta?.patient_id).toBe(patientId);
  });
});
