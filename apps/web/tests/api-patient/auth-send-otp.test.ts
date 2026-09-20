import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/patient/auth/send-otp/route';
import { createTestClinic, createTestPatient, cleanupClinic } from './test-helper';
import { resetRateLimits } from '@/lib/rate-limit';

describe('POST /api/patient/auth/send-otp', () => {
  let clinicId: string;
  const validPhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;

  beforeAll(async () => {
    const clinic = await createTestClinic('OTP Test Clinic');
    clinicId = clinic.id;
    await createTestPatient(clinicId, validPhone, 'OTP Patient');
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  beforeEach(() => {
    resetRateLimits();
  });

  it('returns success and dev_code for a valid registered phone number in dev mode', async () => {
    const req = new Request('http://localhost:3000/api/patient/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: validPhone, clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { success: boolean; dev_code?: string };
    expect(data.success).toBe(true);
    expect(data.dev_code).toBeDefined();
    expect(data.dev_code).toMatch(/^[0-9]{6}$/);
  });

  it('returns success even if phone is not registered (anti-enumeration)', async () => {
    const unregisteredPhone = `+92345${Math.floor(1000000 + Math.random() * 9000000)}`;
    const req = new Request('http://localhost:3000/api/patient/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: unregisteredPhone, clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { success: boolean; dev_code?: string };
    expect(data.success).toBe(true);
    // In dev mode, returns default dev_code 123456
    expect(data.dev_code).toBe('123456');
  });

  it('returns 400 Bad Request for an invalid phone format', async () => {
    const req = new Request('http://localhost:3000/api/patient/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '03001234567', clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = (await res.json()) as { error: string };
    expect(data.error).toBe('Invalid input');
  });

  it('enforces rate limit: 4th OTP request within 15 minutes returns 429', async () => {
    const rateLimitedPhone = `+92333${Math.floor(1000000 + Math.random() * 9000000)}`;
    await createTestPatient(clinicId, rateLimitedPhone, 'Rate Limit Patient');

    const makeRequest = () =>
      POST(
        new Request('http://localhost:3000/api/patient/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: rateLimitedPhone, clinic_id: clinicId }),
        })
      );

    // Sends 1, 2, 3 -> should succeed
    const res1 = await makeRequest();
    expect(res1.status).toBe(200);

    const res2 = await makeRequest();
    expect(res2.status).toBe(200);

    const res3 = await makeRequest();
    expect(res3.status).toBe(200);

    // 4th send -> must return 429 Too Many Requests
    const res4 = await makeRequest();
    expect(res4.status).toBe(429);

    const data4 = (await res4.json()) as { error: string; reset_seconds: number };
    expect(data4.error).toContain('Too many OTP requests');
    expect(data4.reset_seconds).toBeGreaterThan(0);
  });
});
