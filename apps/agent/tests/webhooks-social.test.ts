import { describe, it, expect, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import app from '../src/index';

describe('Social Webhook Handlers (/webhooks/social)', () => {
  const db = getDefaultDb();
  const testIgUser = 'ig_user_test_101';
  const testFbUser = 'fb_user_test_202';

  afterAll(async () => {
    try {
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.from, testIgUser));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testIgUser));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.from, testFbUser));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testFbUser));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('GET responds 200 with challenge on correct verification token', async () => {
    const res = await app.request(
      '/webhooks/social?hub.mode=subscribe&hub.verify_token=dental_webhook_secret_verify_token_2026&hub.challenge=social_challenge_789',
      { method: 'GET' }
    );

    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('social_challenge_789');
  });

  it('POST with Instagram mock payload runs agent and returns 200', async () => {
    const res = await app.request('/webhooks/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform: 'instagram',
        from: testIgUser,
        body: 'Do you offer dental cleaning services?',
      }),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.platform).toBe('instagram');
    expect(data.tool_intents).toContain('get_clinic_info');

    // Verify outbound reply recorded in dev_outbox
    const [outbound] = await db
      .select()
      .from(schema.devOutbox)
      .where(eq(schema.devOutbox.to, testIgUser));
    expect(outbound).toBeDefined();
    expect(outbound?.channel).toBe('instagram');
  });

  it('POST with Facebook Messenger payload runs agent and returns 200', async () => {
    const metaFacebookPayload = {
      object: 'page',
      entry: [
        {
          id: 'fb_page_id_333',
          time: 1726588800,
          messaging: [
            {
              sender: { id: testFbUser },
              recipient: { id: 'fb_page_id_333' },
              timestamp: 1726588800,
              message: {
                mid: 'mid_fb_123',
                text: 'What are your clinic hours?',
              },
            },
          ],
        },
      ],
    };

    const res = await app.request('/webhooks/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metaFacebookPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('success');
    expect(data.platform).toBe('facebook');
    expect(data.tool_intents).toContain('get_clinic_info');
  });
});
