import { describe, it, expect, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import app from '../src/index';

describe('Voice Telephony Webhook Handlers (/webhooks/voice)', () => {
  const db = getDefaultDb();
  const testPhone = '+923005544332';

  afterAll(async () => {
    try {
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.from, testPhone));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testPhone));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('POST with mock voice payload runs agent, returns reply_text for TTS, and returns 200', async () => {
    const res = await app.request('/webhooks/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: testPhone,
        speech: 'I have severe pain in my wisdom tooth',
        call_id: 'call_mock_123',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.call_id).toBe('call_mock_123');
    expect(data.reply_text).toBeDefined();
    expect(data.tool_intents).toContain('triage_symptoms');

    // Verify inbound speech logged to dev_outbox
    const [inbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'voice'),
          eq(schema.devOutbox.from, testPhone),
          eq(schema.devOutbox.direction, 'inbound')
        )
      );
    expect(inbound).toBeDefined();
    expect(inbound?.body).toContain('severe pain');

    // Verify outbound TTS response logged to dev_outbox
    const [outbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'voice'),
          eq(schema.devOutbox.to, testPhone),
          eq(schema.devOutbox.direction, 'outbound')
        )
      );
    expect(outbound).toBeDefined();
    expect(outbound?.body).toBeDefined();
  });

  it('POST with Infobip voice payload runs agent and returns 200', async () => {
    const infobipPayload = {
      callId: 'infobip_call_999',
      caller: { number: '923005544332' },
      speech: { text: 'What are your clinic hours?' },
    };

    const res = await app.request('/webhooks/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(infobipPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.call_id).toBe('infobip_call_999');
    expect(data.tool_intents).toContain('get_clinic_info');
  });

  it('POST with Exotel voice payload runs agent and returns 200', async () => {
    const exotelPayload = {
      CallSid: 'exotel_sid_888',
      From: '923005544332',
      TranscriptionText: 'I would like to schedule an appointment',
    };

    const res = await app.request('/webhooks/voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exotelPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.call_id).toBe('exotel_sid_888');
    expect(data.tool_intents).toContain('check_availability');
  });
});
