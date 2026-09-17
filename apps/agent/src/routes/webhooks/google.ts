import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { config } from '../../config';
import { getAgentRunner } from '../../deps';
import { logDevOutbox } from '../../db/outbox';

export const googleWebhook = new Hono();

interface ParsedGoogleMessage {
  conversationId: string;
  messageId: string;
  text: string;
  userPhone: string;
}

/**
 * Standardize phone to E.164 (+prefix)
 */
function normalizePhone(rawPhone: string): string {
  const trimmed = rawPhone.trim();
  if (trimmed.startsWith('+')) {
    return trimmed;
  }
  return `+${trimmed}`;
}

/**
 * Parses Google Business Messages payload.
 * Accepts { conversationId, messageId, text, userPhone } or canonical variations.
 */
function parseGooglePayload(payload: unknown): ParsedGoogleMessage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  const conversationId =
    (typeof obj['conversationId'] === 'string' && obj['conversationId']) ||
    (typeof obj['conversation_id'] === 'string' && obj['conversation_id']) ||
    `conv_${randomUUID().slice(0, 10)}`;

  const messageId =
    (typeof obj['messageId'] === 'string' && obj['messageId']) ||
    (typeof obj['message_id'] === 'string' && obj['message_id']) ||
    `msg_${randomUUID().slice(0, 10)}`;

  const text =
    (typeof obj['text'] === 'string' && obj['text'].trim()) ||
    (typeof obj['body'] === 'string' && obj['body'].trim()) ||
    '';

  const rawPhone =
    (typeof obj['userPhone'] === 'string' && obj['userPhone'].trim()) ||
    (typeof obj['user_phone'] === 'string' && obj['user_phone'].trim()) ||
    (typeof obj['from'] === 'string' && obj['from'].trim()) ||
    '';

  if (!rawPhone || !text) {
    return null;
  }

  return {
    conversationId,
    messageId,
    text,
    userPhone: normalizePhone(rawPhone),
  };
}

/**
 * POST /webhooks/google — Inbound Google Business Messages handler.
 */
googleWebhook.post('/google', async (c) => {
  let jsonPayload: unknown;
  try {
    jsonPayload = await c.req.json();
  } catch {
    return c.json({ error: 'Malformed Google payload: invalid JSON body' }, 400);
  }

  const parsed = parseGooglePayload(jsonPayload);
  if (!parsed) {
    return c.json(
      {
        error:
          'Malformed Google payload. Expected { conversationId, messageId, text, userPhone }',
      },
      400
    );
  }

  const sessionKey = `google:${parsed.userPhone}`;
  const providerMode = process.env['GOOGLE_MODE'] ?? 'mock';

  try {
    // 1. Log inbound message to dev_outbox
    await logDevOutbox({
      channel: 'google',
      from: parsed.userPhone,
      to: 'system',
      body: parsed.text,
      provider: providerMode,
      direction: 'inbound',
      metadata: JSON.stringify({
        conversationId: parsed.conversationId,
        messageId: parsed.messageId,
      }),
    });

    // 2. Invoke AgentRunner turn
    const runner = getAgentRunner();
    const result = await runner.handleInbound({
      channel: 'google',
      sender: parsed.userPhone,
      body: parsed.text,
      conversation_id: sessionKey,
      clinic_id: config.DEFAULT_CLINIC_ID,
    });

    // 3. Log outbound message to dev_outbox
    await logDevOutbox({
      channel: 'google',
      from: 'system',
      to: parsed.userPhone,
      body: result.reply,
      provider: providerMode,
      direction: 'outbound',
      metadata: JSON.stringify({
        conversationId: parsed.conversationId,
        replyTo: parsed.messageId,
      }),
    });

    // 4. Return success with agent reply
    return c.json(
      {
        status: 'success',
        conversationId: parsed.conversationId,
        messageId: parsed.messageId,
        reply: result.reply,
        session_id: sessionKey,
        tool_intent: result.tool_intent,
        tool_intents: result.tool_intents,
      },
      200
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Google Webhook Error] Failed message from ${parsed.userPhone}:`, errorMsg);
    return c.json({ status: 'error', error: errorMsg }, 200);
  }
});
