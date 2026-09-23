import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { POST as register } from '@/app/api/patient/auth/register/route';
import { POST as login } from '@/app/api/patient/auth/login/route';
import { createTestClinic, cleanupClinic } from './test-helper';

describe('POST /api/patient/auth/login', () => {
  let clinicId: string;
  const suffix = Math.floor(1000000 + Math.random() * 9000000);
  const testEmail = `login-${suffix}@test.com`;
  const testPassword = 'Password123!';

  beforeAll(async () => {
    const clinic = await createTestClinic('Login Test Clinic');
    clinicId = clinic.id;

    // Register test patient
    const regReq = new Request('http://localhost:3000/api/patient/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Test Login Patient',
        cnic: `35201-${suffix}-1`,
        phone: `+92300${suffix}`,
        age: 30,
        gender: 'male',
        email: testEmail,
        password: testPassword,
        clinic_id: clinicId,
      }),
    });
    await register(regReq);
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('successfully logs in with valid credentials', async () => {
    const req = new Request('http://localhost:3000/api/patient/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        clinic_id: clinicId,
      }),
    });

    const res = await login(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { token: string; patient: { email: string } };
    expect(data.token).toBeDefined();
    expect(data.patient.email).toBe(testEmail);
  });

  it('rejects invalid password with generic 401', async () => {
    const req = new Request('http://localhost:3000/api/patient/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword999!',
        clinic_id: clinicId,
      }),
    });

    const res = await login(req);
    expect(res.status).toBe(401);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Invalid credentials');
  });
});
