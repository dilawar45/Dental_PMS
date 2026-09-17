import { Hono } from 'hono';
import { z } from 'zod';
import { getAgentRunner } from '../deps';

export const devRoute = new Hono();

const simulateInboundSchema = z.object({
  channel: z.string().default('whatsapp'),
  from: z.string().default('+923001234500'),
  body: z.string(),
  clinic_id: z.string().optional(),
});

devRoute.post('/simulate-inbound', async (c) => {
  try {
    const rawBody = await c.req.json();
    const parsed = simulateInboundSchema.parse(rawBody);

    const runner = getAgentRunner();
    const result = await runner.handleInbound({
      channel: parsed.channel,
      sender: parsed.from,
      body: parsed.body,
      clinic_id: parsed.clinic_id,
    });

    return c.json({
      reply: result.reply,
      tool_intent: result.tool_intent,
      session_id: result.session_id,
      channel: result.channel,
      logged: result.logged,
      tool_intents: result.tool_intents,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: err.errors }, 400);
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return c.json({ error: message }, 500);
  }
});
