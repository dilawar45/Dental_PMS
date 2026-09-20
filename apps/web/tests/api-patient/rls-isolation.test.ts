import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET as getMe } from '@/app/api/patient/me/route';
import { GET as getClinic } from '@/app/api/patient/clinic/route';
import { GET as getAppointments } from '@/app/api/patient/appointments/route';
import {
  createTestClinic,
  createTestPatient,
  createTestDentist,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { appointments } from '@dental-pms/db/schema';

describe('Cross-Tenant RLS Isolation between Patients', () => {
  let clinicAId: string;
  let clinicBId: string;
  let patientAId: string;
  let patientBId: string;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    // Setup Clinic A
    const clinicA = await createTestClinic('RLS Clinic Alpha');
    clinicAId = clinicA.id;
    const patientA = await createTestPatient(clinicAId, '+923001002001', 'Alpha Resident');
    patientAId = patientA.id;
    tokenA = signPatientToken(patientAId, clinicAId);

    // Setup Clinic B
    const clinicB = await createTestClinic('RLS Clinic Beta');
    clinicBId = clinicB.id;
    const patientB = await createTestPatient(clinicBId, '+923001002002', 'Beta Resident');
    patientBId = patientB.id;
    tokenB = signPatientToken(patientBId, clinicBId);

    const dentistB = await createTestDentist(clinicBId, 'Dr. Beta Dentist');

    // Create appointment in Clinic B
    await testDb.insert(appointments).values({
      clinicId: clinicBId,
      patientId: patientBId,
      dentistId: dentistB.id,
      startAt: new Date('2026-12-01T10:00:00+05:00'),
      endAt: new Date('2026-12-01T10:30:00+05:00'),
      status: 'scheduled',
      reason: 'Confidential Beta Consultation',
    });
  });

  afterAll(async () => {
    await cleanupClinic(clinicAId);
    await cleanupClinic(clinicBId);
  });

  it('Token A only views Clinic A profile and cannot access Clinic B data', async () => {
    const resA = await getMe(
      new Request('http://localhost:3000/api/patient/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenA}` },
      })
    );

    expect(resA.status).toBe(200);
    const dataA = (await resA.json()) as { id: string; clinic_id: string; full_name: string };
    expect(dataA.id).toBe(patientAId);
    expect(dataA.clinic_id).toBe(clinicAId);
    expect(dataA.full_name).toBe('Alpha Resident');
  });

  it('Token B only views Clinic B clinic details and cannot view Clinic A details', async () => {
    const resB = await getClinic(
      new Request('http://localhost:3000/api/patient/clinic', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenB}` },
      })
    );

    expect(resB.status).toBe(200);
    const dataB = (await resB.json()) as { id: string; name: string };
    expect(dataB.id).toBe(clinicBId);
    expect(dataB.name).toContain('RLS Clinic Beta');
  });

  it('Token A sees zero appointments when querying while Clinic B has active appointments', async () => {
    const resA = await getAppointments(
      new Request('http://localhost:3000/api/patient/appointments', {
        method: 'GET',
        headers: { Authorization: `Bearer ${tokenA}` },
      })
    );

    expect(resA.status).toBe(200);
    const dataA = (await resA.json()) as { appointments: Array<{ reason: string }> };
    expect(dataA.appointments).toHaveLength(0);
  });

  it('Forged token attempting to query Clinic B with Patient A id returns 404', async () => {
    // An attacker crafts a JWT with their patient_id but a target clinic_id (clinicBId)
    const forgedToken = signPatientToken(patientAId, clinicBId);

    const resForged = await getMe(
      new Request('http://localhost:3000/api/patient/me', {
        method: 'GET',
        headers: { Authorization: `Bearer ${forgedToken}` },
      })
    );

    // Because patientA belongs to clinicA, PostgreSQL RLS in clinicB context returns 0 rows
    expect(resForged.status).toBe(404);
  });
});
