import { Hono } from 'hono';
import { z } from 'zod';
import { sendPushToPatient } from '../lib/push';

export const notifyRoute = new Hono();

const notifySchema = z.object({
  patient_id: z.string().uuid('Invalid patient_id format'),
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  data: z.record(z.string()).optional(),
});

/**
 * POST /notify — Endpoint to trigger push notifications to a patient.
 * Called by web server actions (e.g. on booking approval/rejection) or internal schedulers.
 * Protected by X-Simulator-Secret in production.
 */
notifyRoute.post('/notify', async (c) => {
  const secret = c.req.header('x-simulator-secret');
  const expectedSecret = process.env['SIMULATOR_SHARED_SECRET'];

  // Auth gate in production
  if (process.env['NODE_ENV'] === 'production') {
    if (!secret || !expectedSecret || secret !== expectedSecret) {
      return c.json({ error: 'Unauthorized: missing or invalid X-Simulator-Secret' }, 401);
    }
  }

  try {
    const rawBody = await c.req.json();
    const parsed = notifySchema.parse(rawBody);

    const result = await sendPushToPatient(parsed.patient_id, {
      title: parsed.title,
      body: parsed.body,
      data: parsed.data,
    });

    return c.json({
      success: result.success,
      sent_count: result.sentCount,
      mode: result.mode,
      details: result.details,
    });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return c.json({ error: 'Validation Error', details: err.errors }, 400);
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return c.json({ error: message }, 500);
  }
});
