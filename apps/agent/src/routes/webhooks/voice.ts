import { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import { config } from '../../config';
import { getAgentRunner } from '../../deps';
import { logDevOutbox } from '../../db/outbox';

export const voiceWebhook = new Hono();

interface ParsedVoicePayload {
  from: string;
  speech: string;
  callId: string;
  timestamp: string;
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
 * Parses telephony voice webhook payloads supporting Mock, Infobip, and Exotel formats.
 */
function parseVoicePayload(payload: unknown): ParsedVoicePayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const obj = payload as Record<string, unknown>;

  // 1. Extract caller telephone number
  let rawFrom = '';
  if (typeof obj['from'] === 'string') {
    rawFrom = obj['from'];
  } else if (typeof obj['From'] === 'string') {
    rawFrom = obj['From'];
  } else if (typeof obj['caller_id'] === 'string') {
    rawFrom = obj['caller_id'];
  } else if (obj['caller'] && typeof obj['caller'] === 'object') {
    const callerObj = obj['caller'] as Record<string, unknown>;
    if (typeof callerObj['number'] === 'string') {
      rawFrom = callerObj['number'];
    }
  }

  if (!rawFrom) {
    return null;
  }

  // 2. Extract transcribed speech or body text
  let speech = '';
  if (typeof obj['speech'] === 'string') {
    speech = obj['speech'];
  } else if (obj['speech'] && typeof obj['speech'] === 'object') {
    const speechObj = obj['speech'] as Record<string, unknown>;
    if (typeof speechObj['text'] === 'string') {
      speech = speechObj['text'];
    }
  } else if (typeof obj['body'] === 'string') {
    speech = obj['body'];
  } else if (typeof obj['text'] === 'string') {
    speech = obj['text'];
  } else if (typeof obj['TranscriptionText'] === 'string') {
    speech = obj['TranscriptionText'];
  } else if (obj['transcription'] && typeof obj['transcription'] === 'object') {
    const transObj = obj['transcription'] as Record<string, unknown>;
    if (typeof transObj['text'] === 'string') {
      speech = transObj['text'];
    }
  }

  // 3. Extract or generate call ID
  const callId =
    (typeof obj['call_id'] === 'string' && obj['call_id']) ||
    (typeof obj['callId'] === 'string' && obj['callId']) ||
    (typeof obj['CallSid'] === 'string' && obj['CallSid']) ||
    `call_${randomUUID().slice(0, 12)}`;

  const timestamp =
    typeof obj['timestamp'] === 'string' ? obj['timestamp'] : new Date().toISOString();

  return {
    from: normalizePhone(rawFrom),
    speech: speech.trim(),
    callId,
    timestamp,
  };
}

/**
 * POST /webhooks/voice — Inbound telephony transcript handler.
 */
voiceWebhook.post('/voice', async (c) => {
  let jsonPayload: unknown;
  try {
    jsonPayload = await c.req.json();
  } catch {
    return c.json({ error: 'Malformed voice payload: invalid JSON body' }, 400);
  }

  const parsed = parseVoicePayload(jsonPayload);
  if (!parsed || !parsed.from) {
    return c.json(
      {
        error:
          'Malformed voice payload: missing caller telephone number (expected from, From, or caller.number)',
      },
      400
    );
  }

  if (!parsed.speech) {
    return c.json(
      {
        error:
          'Malformed voice payload: missing transcribed speech text (expected speech, body, text, or TranscriptionText)',
      },
      400
    );
  }

  const sessionKey = `voice:${parsed.from}`;
  const providerMode = process.env['VOICE_PROVIDER'] ?? 'mock';

  try {
    // 1. Log inbound transcribed speech to dev_outbox
    await logDevOutbox({
      channel: 'voice',
      from: parsed.from,
      to: 'system',
      body: parsed.speech,
      provider: providerMode,
      direction: 'inbound',
      metadata: JSON.stringify({ callId: parsed.callId, timestamp: parsed.timestamp }),
    });

    // 2. Invoke AgentRunner turn
    const runner = getAgentRunner();
    const result = await runner.handleInbound({
      channel: 'voice',
      sender: parsed.from,
      body: parsed.speech,
      conversation_id: sessionKey,
      clinic_id: config.DEFAULT_CLINIC_ID,
    });

    // 3. Log outbound synthesized speech response to dev_outbox
    await logDevOutbox({
      channel: 'voice',
      from: 'system',
      to: parsed.from,
      body: result.reply,
      provider: providerMode,
      direction: 'outbound',
      metadata: JSON.stringify({ callId: parsed.callId, timestamp: new Date().toISOString() }),
    });

    // 4. Return reply text for provider TTS conversion
    return c.json(
      {
        status: 'success',
        call_id: parsed.callId,
        reply_text: result.reply,
        session_id: sessionKey,
        tool_intent: result.tool_intent,
        tool_intents: result.tool_intents,
      },
      200
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Voice Webhook Error] Call ${parsed.callId} failed:`, errorMsg);
    return c.json(
      {
        status: 'error',
        call_id: parsed.callId,
        reply_text: 'Thank you for calling. Our staff will follow up with you shortly.',
        error: errorMsg,
      },
      200
    );
  }
});
