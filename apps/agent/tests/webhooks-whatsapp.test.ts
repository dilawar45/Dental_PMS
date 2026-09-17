import { describe, it, expect, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import app from '../src/index';

describe('WhatsApp Webhook Handlers (/webhooks/whatsapp)', () => {
  const db = getDefaultDb();
  const testPhone = '+923001122334';

  afterAll(async () => {
    try {
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.from, testPhone));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testPhone));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('GET responds 200 with challenge on correct verification token', async () => {
    const res = await app.request(
      '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=dental_webhook_secret_verify_token_2026&hub.challenge=test_challenge_abc_123',
      { method: 'GET' }
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('test_challenge_abc_123');
  });

  it('GET responds 403 on invalid verification token', async () => {
    const res = await app.request(
      '/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_invalid_token&hub.challenge=test_challenge_abc_123',
      { method: 'GET' }
    );

    expect(res.status).toBe(403);
    const body = await res.text();
    expect(body).toContain('Forbidden');
  });

  it('POST with valid mock payload runs agent, logs inbound/outbound to dev_outbox, and returns 200', async () => {
    const res = await app.request('/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: testPhone,
        body: 'I want to book an appointment',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.tool_intents).toContain('check_availability');

    // Verify inbound row in dev_outbox
    const [inbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'whatsapp'),
          eq(schema.devOutbox.from, testPhone),
          eq(schema.devOutbox.direction, 'inbound')
        )
      );
    expect(inbound).toBeDefined();
    expect(inbound?.body).toBe('I want to book an appointment');

    // Verify outbound reply in dev_outbox
    const [outbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'whatsapp'),
          eq(schema.devOutbox.to, testPhone),
          eq(schema.devOutbox.direction, 'outbound')
        )
      );
    expect(outbound).toBeDefined();
    expect(outbound?.body).toBeDefined();
  });

  it('POST with official Meta Cloud API payload runs agent and returns 200', async () => {
    const metaPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: '100000000000002',
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                contacts: [{ profile: { name: 'Ali' }, wa_id: '923001122334' }],
                messages: [
                  {
                    from: '923001122334',
                    id: 'wamid.HBgLMQ==',
                    timestamp: '1726588800',
                    type: 'text',
                    text: { body: 'What are your hours?' },
                  },
                ],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    const res = await app.request('/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.tool_intents).toContain('get_clinic_info');
  });

  it('POST with non-text attachment replies with canned message', async () => {
    const res = await app.request('/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: testPhone,
        type: 'image',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.reply_sent).toBe(true);
  });
});
