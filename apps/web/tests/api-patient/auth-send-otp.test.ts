import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as register } from '@/app/api/patient/auth/register/route';
import { createTestClinic, cleanupClinic } from './test-helper';

describe('POST /api/patient/auth/register', () => {
  let clinicId: string;

  beforeAll(async () => {
    const clinic = await createTestClinic('Register Test Clinic');
    clinicId = clinic.id;
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('successfully registers a new patient with valid fields', async () => {
    const suffix = Math.floor(1000000 + Math.random() * 9000000);
    const req = new Request('http://localhost:3000/api/patient/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Register Patient',
        cnic: `35201-${suffix}-1`,
        phone: `+92300${suffix}`,
        age: 28,
        gender: 'female',
        email: `reg-${suffix}@test.com`,
        password: 'Password123!',
        clinic_id: clinicId,
      }),
    });

    const res = await register(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { token: string; patient: { id: string; email: string } };
    expect(data.token).toBeDefined();
    expect(data.patient.id).toBeDefined();
    expect(data.patient.email).toBe(`reg-${suffix}@test.com`);
  });

  it('rejects invalid password format', async () => {
    const req = new Request('http://localhost:3000/api/patient/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Invalid PW',
        cnic: '35201-1234567-1',
        phone: '+923001234567',
        age: 25,
        gender: 'male',
        email: 'invalid-pw@test.com',
        password: 'short',
        clinic_id: clinicId,
      }),
    });

    const res = await register(req);
    expect(res.status).toBe(400);
  });
});
