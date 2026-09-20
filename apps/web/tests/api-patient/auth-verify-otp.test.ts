import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { POST } from '@/app/api/patient/auth/verify-otp/route';
import { createTestClinic, createTestPatient, cleanupClinic, testDb } from './test-helper';
import { patientOtps } from '@dental-pms/db/schema';
import { verifyPatientToken } from '@/lib/patient-auth';

describe('POST /api/patient/auth/verify-otp', () => {
  let clinicId: string;
  const testPhone = `+92321${Math.floor(1000000 + Math.random() * 9000000)}`;

  beforeAll(async () => {
    const clinic = await createTestClinic('Verify OTP Clinic');
    clinicId = clinic.id;
    await createTestPatient(clinicId, testPhone, 'Verify Patient');
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('issues a valid 30-day JWT when given the correct OTP code', async () => {
    const code = '654321';
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    await testDb.insert(patientOtps).values({
      phone: testPhone,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    const req = new Request('http://localhost:3000/api/patient/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code, clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      token: string;
      patient: { id: string; full_name: string; phone: string };
    };

    expect(data.token).toBeDefined();
    expect(data.patient.phone).toBe(testPhone);

    // Verify the returned JWT
    const verified = verifyPatientToken(data.token);
    expect(verified).not.toBeNull();
    expect(verified?.clinic_id).toBe(clinicId);
    expect(verified?.patient_id).toBe(data.patient.id);
  });

  it('returns 401 when given an incorrect OTP code', async () => {
    const correctCode = '112233';
    const codeHash = crypto.createHash('sha256').update(correctCode).digest('hex');

    await testDb.insert(patientOtps).values({
      phone: testPhone,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    const req = new Request('http://localhost:3000/api/patient/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: '999999', clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Invalid or expired');
  });

  it('returns 401 when the OTP code has expired', async () => {
    const expiredCode = '445566';
    const codeHash = crypto.createHash('sha256').update(expiredCode).digest('hex');

    // Expired 1 minute ago
    await testDb.insert(patientOtps).values({
      phone: testPhone,
      codeHash,
      expiresAt: new Date(Date.now() - 60 * 1000),
      attempts: 0,
    });

    const req = new Request('http://localhost:3000/api/patient/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: expiredCode, clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('invalidates OTP after more than 5 failed attempts', async () => {
    const bruteCode = '778899';
    const codeHash = crypto.createHash('sha256').update(bruteCode).digest('hex');

    await testDb.insert(patientOtps).values({
      phone: testPhone,
      codeHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 5, // Already reached 5
    });

    // 6th attempt
    const req = new Request('http://localhost:3000/api/patient/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone, code: '000000', clinic_id: clinicId }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);

    const data = (await res.json()) as { error: string };
    expect(data.error).toContain('Too many failed verification attempts');
  });
});
