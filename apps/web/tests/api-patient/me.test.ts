import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET, PATCH } from '@/app/api/patient/me/route';
import { createTestClinic, createTestPatient, cleanupClinic } from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';

describe('/api/patient/me', () => {
  let clinicId: string;
  let patientId: string;
  let token: string;
  const testPhone = `+92334${Math.floor(1000000 + Math.random() * 9000000)}`;

  beforeAll(async () => {
    const clinic = await createTestClinic('Me Test Clinic');
    clinicId = clinic.id;
    const patient = await createTestPatient(clinicId, testPhone, 'Zainab Ahmed');
    patientId = patient.id;
    token = signPatientToken(patientId, clinicId);
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('returns 401 when Authorization header is missing', async () => {
    const req = new Request('http://localhost:3000/api/patient/me', {
      method: 'GET',
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when Authorization token is invalid or tampered', async () => {
    const req = new Request('http://localhost:3000/api/patient/me', {
      method: 'GET',
      headers: { Authorization: 'Bearer invalid.tampered.token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns patient profile when given a valid JWT', async () => {
    const req = new Request('http://localhost:3000/api/patient/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      id: string;
      full_name: string;
      phone: string;
      preferred_language: string;
      clinic_id: string;
    };

    expect(data.id).toBe(patientId);
    expect(data.full_name).toBe('Zainab Ahmed');
    expect(data.phone).toBe(testPhone);
    expect(data.clinic_id).toBe(clinicId);
  });

  it('PATCH /me successfully updates profile fields', async () => {
    const req = new Request('http://localhost:3000/api/patient/me', {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferred_language: 'ur',
        address: 'House 42, Street 7, Islamabad',
      }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      preferred_language: string;
      address: string;
    };
    expect(data.preferred_language).toBe('ur');
    expect(data.address).toBe('House 42, Street 7, Islamabad');
  });
});
