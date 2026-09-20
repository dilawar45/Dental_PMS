import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { POST } from '@/app/api/patient/chat/route';
import {
  createTestClinic,
  createTestPatient,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { resetRateLimits } from '@/lib/rate-limit';
import { devOutbox } from '@dental-pms/db/schema';
import { eq, and } from 'drizzle-orm';

describe('POST /api/patient/chat', () => {
  let clinicId: string;
  let patientId: string;
  let token: string;
  const testPhone = `+923008877665`;

  beforeAll(async () => {
    const clinic = await createTestClinic('Chat Test Clinic');
    clinicId = clinic.id;
    const patient = await createTestPatient(clinicId, testPhone, 'Chat Patient');
    patientId = patient.id;
    token = signPatientToken(patientId, clinicId);
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  beforeEach(() => {
    resetRateLimits();
  });

  it('proxies chat message and returns assistant reply', async () => {
    const messageBody = 'What are your clinic opening hours?';

    const req = new Request('http://localhost:3000/api/patient/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: messageBody }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { reply: string; tool_intents: string[] };
    expect(data.reply).toBeDefined();
    expect(data.reply.length).toBeGreaterThan(0);

    // Verify logged to dev_outbox with channel 'patient_app'
    const loggedMessages = await testDb
      .select()
      .from(devOutbox)
      .where(
        and(
          eq(devOutbox.channel, 'patient_app'),
          eq(devOutbox.from, testPhone)
        )
      );

    expect(loggedMessages.length).toBeGreaterThanOrEqual(1);
    expect(loggedMessages[0]?.body).toBe(messageBody);
  });

  it('returns 400 Bad Request when body is empty', async () => {
    const req = new Request('http://localhost:3000/api/patient/chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body: '   ' }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
