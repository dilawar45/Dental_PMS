import { describe, it, expect, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import app from '../src/index';

describe('Google Business Messages Webhook Handlers (/webhooks/google)', () => {
  const db = getDefaultDb();
  const testPhone = '+923008877665';

  afterAll(async () => {
    try {
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.from, testPhone));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testPhone));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('POST with Google Business Messages payload runs agent and returns 200', async () => {
    const res = await app.request('/webhooks/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'google_conv_test_123',
        messageId: 'google_msg_test_456',
        text: 'Where is your dental clinic located?',
        userPhone: testPhone,
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.reply).toBeDefined();
    expect(data.tool_intents).toContain('get_clinic_info');

    // Verify inbound logged to dev_outbox
    const [inbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'google'),
          eq(schema.devOutbox.from, testPhone),
          eq(schema.devOutbox.direction, 'inbound')
        )
      );
    expect(inbound).toBeDefined();
    expect(inbound?.body).toBe('Where is your dental clinic located?');

    // Verify outbound logged to dev_outbox
    const [outbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'google'),
          eq(schema.devOutbox.to, testPhone),
          eq(schema.devOutbox.direction, 'outbound')
        )
      );
    expect(outbound).toBeDefined();
    expect(outbound?.body).toBeDefined();
  });

  it('POST with malformed payload returns 400', async () => {
    const res = await app.request('/webhooks/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 'google_conv_test_123',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});
