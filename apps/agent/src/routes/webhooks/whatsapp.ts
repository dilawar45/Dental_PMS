import { Hono } from 'hono';

export const whatsappWebhook = new Hono();

whatsappWebhook.post('/whatsapp', (c) => {
  return c.json({ error: 'Not Implemented' }, 501);
});
