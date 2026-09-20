import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/patient/doctors/route';
import {
  createTestClinic,
  createTestPatient,
  createTestDentist,
  cleanupClinic,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';

describe('GET /api/patient/doctors', () => {
  let clinicId: string;
  let token: string;
  let dentist1Name: string;

  beforeAll(async () => {
    const clinic = await createTestClinic('Doctors Test Clinic');
    clinicId = clinic.id;
    const patient = await createTestPatient(clinicId, '+923009988771', 'Doctor Seeker');
    token = signPatientToken(patient.id, clinicId);

    dentist1Name = `Dr. Fatima ${Date.now()}`;
    await createTestDentist(clinicId, dentist1Name, 'dentist');
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('returns list of dentists for the authenticated clinic', async () => {
    const req = new Request('http://localhost:3000/api/patient/doctors', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      doctors: Array<{
        id: string;
        full_name: string;
        role: string;
        fee: number;
        fee_currency: string;
        weekly_schedule: string;
      }>;
    };

    expect(data.doctors).toBeDefined();
    expect(data.doctors.length).toBeGreaterThanOrEqual(1);

    const foundDentist = data.doctors.find((d) => d.full_name === dentist1Name);
    expect(foundDentist).toBeDefined();
    expect(foundDentist?.fee).toBe(2000);
    expect(foundDentist?.fee_currency).toBe('PKR');
    expect(foundDentist?.weekly_schedule).toBe('Mon-Sat 09:00-19:00');
  });
});
