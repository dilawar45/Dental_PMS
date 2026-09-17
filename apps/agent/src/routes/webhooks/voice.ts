import { Hono } from 'hono';

export const voiceWebhook = new Hono();

voiceWebhook.post('/voice', (c) => {
  return c.json({ error: 'Not Implemented' }, 501);
});
