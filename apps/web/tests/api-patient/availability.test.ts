import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/patient/availability/route';
import {
  createTestClinic,
  createTestPatient,
  createTestDentist,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { appointments } from '@dental-pms/db/schema';
import type { Slot } from '@dental-pms/db';

describe('GET /api/patient/availability', () => {
  let clinicId: string;
  let patientId: string;
  let dentistId: string;
  let token: string;
  const targetDate = '2026-10-15';

  beforeAll(async () => {
    const clinic = await createTestClinic('Availability Test Clinic');
    clinicId = clinic.id;
    const patient = await createTestPatient(clinicId, '+923005544332', 'Slot Patient');
    patientId = patient.id;
    token = signPatientToken(patientId, clinicId);

    const dentist = await createTestDentist(clinicId, 'Dr. Slot Checker', 'dentist');
    dentistId = dentist.id;

    // Create an existing appointment at 09:00 - 09:30 PKT (04:00 - 04:30 UTC) on targetDate
    await testDb.insert(appointments).values({
      clinicId,
      patientId,
      dentistId,
      startAt: new Date(`${targetDate}T09:00:00+05:00`),
      endAt: new Date(`${targetDate}T09:30:00+05:00`),
      status: 'scheduled',
      reason: 'Existing appointment',
    });
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('returns available 30-min slots excluding the already booked appointment slot', async () => {
    const req = new Request(
      `http://localhost:3000/api/patient/availability?date=${targetDate}&dentist_id=${dentistId}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      date: string;
      available_slots: Slot[];
    };

    expect(data.date).toBe(targetDate);
    expect(data.available_slots.length).toBeGreaterThan(0);

    // The slot 09:00-09:30 (+05:00) is 04:00:00.000Z in ISO
    const bookedIso = new Date(`${targetDate}T09:00:00+05:00`).toISOString();
    const hasBookedSlot = data.available_slots.some(
      (slot) => slot.start === bookedIso && slot.dentist_id === dentistId
    );
    expect(hasBookedSlot).toBe(false);

    // The slot 09:30-10:00 (+05:00) SHOULD be available
    const nextSlotIso = new Date(`${targetDate}T09:30:00+05:00`).toISOString();
    const hasNextSlot = data.available_slots.some(
      (slot) => slot.start === nextSlotIso && slot.dentist_id === dentistId
    );
    expect(hasNextSlot).toBe(true);
  });
});
