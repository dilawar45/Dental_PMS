import { Hono } from 'hono';
import { getSocialProvider } from '@dental-pms/integrations';
import type { SocialPlatform } from '@dental-pms/types';
import { config } from '../../config';
import { getAgentRunner } from '../../deps';
import { logDevOutbox } from '../../db/outbox';
import { verifyMetaSignature } from './security';

export const socialWebhook = new Hono();

interface ParsedSocialMessage {
  platform: SocialPlatform;
  from: string;
  body: string;
  messageId: string;
  timestamp: string;
}

/**
 * Parses either official Meta Graph API (Instagram/Facebook) payloads or simplified developer test payloads.
 */
function parseSocialPayload(payload: unknown): ParsedSocialMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  // 1. Direct mock payload { platform: 'instagram' | 'facebook', from, body, message_id? }
  if (
    (obj['platform'] === 'instagram' || obj['platform'] === 'facebook') &&
    typeof obj['from'] === 'string' &&
    typeof obj['body'] === 'string'
  ) {
    return {
      platform: obj['platform'] as SocialPlatform,
      from: (obj['from'] as string).trim(),
      body: (obj['body'] as string).trim(),
      messageId: (obj['message_id'] as string) || (obj['id'] as string) || `msg_${Date.now()}`,
      timestamp: obj['timestamp'] ? String(obj['timestamp']) : new Date().toISOString(),
    };
  }

  // 2. Official Meta Instagram / Facebook Graph webhook format
  const objectType = obj['object'];
  if (objectType === 'instagram' || objectType === 'page') {
    const platform: SocialPlatform = objectType === 'instagram' ? 'instagram' : 'facebook';
    const entries = obj['entry'] as Array<Record<string, unknown>> | undefined;
    const entry = entries?.[0];
    const messaging = entry?.['messaging'] as Array<Record<string, unknown>> | undefined;
    const msgObj = messaging?.[0];

    if (!msgObj) {
      return null;
    }

    const sender = msgObj['sender'] as Record<string, unknown> | undefined;
    const message = msgObj['message'] as Record<string, unknown> | undefined;

    const fromId = String(sender?.['id'] || '').trim();
    const textBody = typeof message?.['text'] === 'string' ? message['text'].trim() : '';

    if (!fromId) {
      return null;
    }

    return {
      platform,
      from: fromId,
      body: textBody,
      messageId: String(message?.['mid'] || `mid_${Date.now()}`),
      timestamp: String(msgObj['timestamp'] || Math.floor(Date.now() / 1000)),
    };
  }

  return null;
}

/**
 * GET /webhooks/social — Meta verification handshake for Instagram & Facebook DMs.
 */
socialWebhook.get('/social', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const expectedToken =
    process.env['META_SOCIAL_VERIFY_TOKEN'] ||
    process.env['META_WHATSAPP_VERIFY_TOKEN'] ||
    'dental_webhook_secret_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return c.text(challenge ?? '', 200);
  }

  return c.text('Forbidden: Verification token mismatch', 403);
});

/**
 * POST /webhooks/social — Inbound Instagram & Facebook DM handler.
 */
socialWebhook.post('/social', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const appSecret = process.env['META_APP_SECRET'];
  const providerMode = process.env['SOCIAL_PROVIDER'] ?? 'mock';

  // 1. Signature verification
  if (!verifyMetaSignature(rawBody, signature, appSecret, providerMode)) {
    return c.json({ error: 'Forbidden: Invalid X-Hub-Signature-256' }, 403);
  }

  // 2. Parse payload
  let jsonPayload: unknown;
  try {
    jsonPayload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Malformed social payload: invalid JSON body' }, 400);
  }

  const parsed = parseSocialPayload(jsonPayload);
  if (!parsed || !parsed.from) {
    return c.json(
      {
        error:
          'Malformed social payload: expected Meta object ("instagram" | "page") or { platform, from, body }',
      },
      400
    );
  }

  if (!parsed.body) {
    return c.json(
      {
        error: 'Malformed social payload: missing message body text',
      },
      400
    );
  }

  const sessionKey = `${parsed.platform}:${parsed.from}`;

  try {
    // 3. Log inbound DM to dev_outbox
    await logDevOutbox({
      channel: parsed.platform,
      from: parsed.from,
      to: 'system',
      body: parsed.body,
      provider: providerMode,
      direction: 'inbound',
      metadata: JSON.stringify({ messageId: parsed.messageId, timestamp: parsed.timestamp }),
    });

    // 4. Invoke AgentRunner turn
    const runner = getAgentRunner();
    const result = await runner.handleInbound({
      channel: parsed.platform,
      sender: parsed.from,
      body: parsed.body,
      conversation_id: sessionKey,
      clinic_id: config.DEFAULT_CLINIC_ID,
    });

    // 5. Send outbound reply via active Social provider
    const socialProvider = getSocialProvider();
    await socialProvider.sendMessage(parsed.platform, parsed.from, result.reply);

    return c.json(
      {
        status: 'success',
        platform: parsed.platform,
        session_id: sessionKey,
        tool_intent: result.tool_intent,
        tool_intents: result.tool_intents,
        message_id: parsed.messageId,
      },
      200
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(
      `[Social Webhook Error] Failed processing message from ${parsed.platform}:${parsed.from}:`,
      errorMsg
    );
    return c.json({ status: 'error', error: errorMsg }, 200);
  }
});
