import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/patient/appointments/route';
import {
  createTestClinic,
  createTestPatient,
  createTestDentist,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { appointments } from '@dental-pms/db/schema';

describe('GET /api/patient/appointments', () => {
  let clinicId: string;
  let patientAId: string;
  let patientBId: string;
  let tokenA: string;
  let dentistId: string;

  beforeAll(async () => {
    const clinic = await createTestClinic('Appts Test Clinic');
    clinicId = clinic.id;

    const patientA = await createTestPatient(clinicId, '+923001112233', 'Patient A');
    patientAId = patientA.id;
    tokenA = signPatientToken(patientAId, clinicId);

    const patientB = await createTestPatient(clinicId, '+923009998877', 'Patient B');
    patientBId = patientB.id;

    const dentist = await createTestDentist(clinicId, 'Dr. Appt Specialist');
    dentistId = dentist.id;

    // Create appointment for Patient A
    await testDb.insert(appointments).values({
      clinicId,
      patientId: patientAId,
      dentistId,
      startAt: new Date('2026-11-01T10:00:00+05:00'),
      endAt: new Date('2026-11-01T10:30:00+05:00'),
      status: 'scheduled',
      reason: 'Patient A Checkup',
    });

    // Create appointment for Patient B
    await testDb.insert(appointments).values({
      clinicId,
      patientId: patientBId,
      dentistId,
      startAt: new Date('2026-11-01T11:00:00+05:00'),
      endAt: new Date('2026-11-01T11:30:00+05:00'),
      status: 'scheduled',
      reason: 'Patient B Cleaning',
    });
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('returns only the caller appointments and not other patients appointments', async () => {
    const req = new Request('http://localhost:3000/api/patient/appointments', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      appointments: Array<{
        id: string;
        reason: string;
        dentist_name: string;
      }>;
    };

    expect(data.appointments.length).toBe(1);
    expect(data.appointments[0]?.reason).toBe('Patient A Checkup');

    const hasPatientB = data.appointments.some(
      (a) => a.reason === 'Patient B Cleaning'
    );
    expect(hasPatientB).toBe(false);
  });
});
