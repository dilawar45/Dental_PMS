import { Hono } from 'hono';
import { getWhatsAppProvider } from '@dental-pms/integrations';
import { config } from '../../config';
import { getAgentRunner } from '../../deps';
import { logDevOutbox } from '../../db/outbox';
import { verifyMetaSignature } from './security';

export const whatsappWebhook = new Hono();

interface ParsedWhatsAppMessage {
  from: string;
  body: string;
  messageId: string;
  timestamp: string;
  type: string;
}

/**
 * Parses either official Meta WhatsApp Cloud API payload or simplified developer test payload.
 */
function parseWhatsAppPayload(payload: unknown): {
  message?: ParsedWhatsAppMessage;
  isStatusUpdate?: boolean;
} {
  if (!payload || typeof payload !== 'object') {
    return {};
  }

  const obj = payload as Record<string, unknown>;

  // 1. Direct mock payload { from, body, type?, message_id? }
  if (typeof obj['from'] === 'string' && (typeof obj['body'] === 'string' || obj['type'])) {
    return {
      message: {
        from: (obj['from'] as string).trim(),
        body: typeof obj['body'] === 'string' ? (obj['body'] as string).trim() : '',
        messageId: (obj['message_id'] as string) || (obj['id'] as string) || `msg_${Date.now()}`,
        timestamp: obj['timestamp'] ? String(obj['timestamp']) : new Date().toISOString(),
        type: (obj['type'] as string) || 'text',
      },
    };
  }

  // 2. Official Meta WhatsApp Cloud API payload format
  if (obj['object'] === 'whatsapp_business_account' || Array.isArray(obj['entry'])) {
    const entries = obj['entry'] as Array<Record<string, unknown>>;
    const entry = entries[0];
    const changes = (entry?.['changes'] as Array<Record<string, unknown>>) || [];
    const change = changes[0];
    const value = change?.['value'] as Record<string, unknown> | undefined;

    if (!value) {
      return {};
    }

    // Check for Meta delivery status receipts (sent, delivered, read)
    if (Array.isArray(value['statuses']) && value['statuses'].length > 0) {
      return { isStatusUpdate: true };
    }

    const messages = value['messages'] as Array<Record<string, unknown>> | undefined;
    const message = messages?.[0];
    if (!message) {
      return { isStatusUpdate: true };
    }

    const type = (message['type'] as string) || 'unknown';
    let body = '';
    if (type === 'text') {
      const textObj = message['text'] as Record<string, unknown> | undefined;
      body = typeof textObj?.['body'] === 'string' ? textObj['body'].trim() : '';
    }

    return {
      message: {
        from: String(message['from'] || '').trim(),
        body,
        messageId: String(message['id'] || `wamid_${Date.now()}`),
        timestamp: String(message['timestamp'] || Math.floor(Date.now() / 1000)),
        type,
      },
    };
  }

  return {};
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
 * GET /webhooks/whatsapp — Meta's verification handshake.
 */
whatsappWebhook.get('/whatsapp', (c) => {
  const mode = c.req.query('hub.mode');
  const token = c.req.query('hub.verify_token');
  const challenge = c.req.query('hub.challenge');

  const expectedToken =
    process.env['META_WHATSAPP_VERIFY_TOKEN'] || 'dental_webhook_secret_verify_token_2026';

  if (mode === 'subscribe' && token === expectedToken) {
    return c.text(challenge ?? '', 200);
  }

  return c.text('Forbidden: Verification token mismatch', 403);
});

/**
 * POST /webhooks/whatsapp — Inbound message handler.
 */
whatsappWebhook.post('/whatsapp', async (c) => {
  const rawBody = await c.req.text();
  const signature = c.req.header('x-hub-signature-256');
  const appSecret = process.env['META_APP_SECRET'];
  const providerMode = process.env['WHATSAPP_PROVIDER'] ?? 'mock';

  // 1. Signature verification
  if (!verifyMetaSignature(rawBody, signature, appSecret, providerMode)) {
    return c.json({ error: 'Forbidden: Invalid X-Hub-Signature-256' }, 403);
  }

  // 2. Parse payload
  let jsonPayload: unknown;
  try {
    jsonPayload = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Malformed payload: invalid JSON body' }, 400);
  }

  const { message, isStatusUpdate } = parseWhatsAppPayload(jsonPayload);

  // Status updates (delivered, read) ACKed immediately
  if (isStatusUpdate && !message) {
    return c.json({ status: 'ignored_status_receipt' }, 200);
  }

  if (!message || !message.from) {
    return c.json(
      {
        error:
          'Malformed WhatsApp payload. Expected Meta webhook format or { from: string, body: string }',
      },
      400
    );
  }

  const fromPhone = normalizePhone(message.from);
  const sessionKey = `whatsapp:${fromPhone}`;

  try {
    const whatsappProvider = getWhatsAppProvider();

    // 3. Handle non-text attachments (images, voice notes, documents)
    if (message.type !== 'text') {
      const cannedReply =
        'Thank you for reaching out! I can currently only read text messages. Please send your inquiry as text, or call our clinic directly.';

      await logDevOutbox({
        channel: 'whatsapp',
        from: fromPhone,
        to: 'system',
        body: `[Non-text message: ${message.type}]`,
        provider: providerMode,
        direction: 'inbound',
        metadata: JSON.stringify({ messageId: message.messageId, type: message.type }),
      });

      await whatsappProvider.sendMessage(fromPhone, cannedReply);

      return c.json(
        {
          status: 'success',
          type: message.type,
          reply_sent: true,
          message_id: message.messageId,
        },
        200
      );
    }

    // 4. Log inbound text message to dev_outbox
    await logDevOutbox({
      channel: 'whatsapp',
      from: fromPhone,
      to: 'system',
      body: message.body,
      provider: providerMode,
      direction: 'inbound',
      metadata: JSON.stringify({ messageId: message.messageId, timestamp: message.timestamp }),
    });

    // 5. Invoke AgentRunner turn
    const runner = getAgentRunner();
    const result = await runner.handleInbound({
      channel: 'whatsapp',
      sender: fromPhone,
      body: message.body,
      conversation_id: sessionKey,
      clinic_id: config.DEFAULT_CLINIC_ID,
    });

    // 6. Dispatch outbound reply via active WhatsApp provider
    await whatsappProvider.sendMessage(fromPhone, result.reply);

    return c.json(
      {
        status: 'success',
        session_id: sessionKey,
        tool_intent: result.tool_intent,
        tool_intents: result.tool_intents,
        message_id: message.messageId,
      },
      200
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[WhatsApp Webhook Error] Failed handling message from ${fromPhone}:`, errorMsg);
    // Never let Meta retry broken messages in loop; return 200 with error summary
    return c.json({ status: 'error', error: errorMsg }, 200);
  }
});
