import { Hono } from 'hono';

export const socialWebhook = new Hono();

socialWebhook.post('/social', (c) => {
  return c.json({ error: 'Not Implemented' }, 501);
});
