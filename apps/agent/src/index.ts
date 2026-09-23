import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { config } from './config';
import { healthRoute } from './routes/health';
import { devRoute } from './routes/dev';
import { whatsappWebhook } from './routes/webhooks/whatsapp';
import { voiceWebhook } from './routes/webhooks/voice';
import { socialWebhook } from './routes/webhooks/social';
import { googleWebhook } from './routes/webhooks/google';

import { simulateRoute } from './routes/simulate';
import { notifyRoute } from './routes/notify';
import { startReminderScheduler } from './scheduler';

const app = new Hono();

// Global health and info
app.route('/', healthRoute);

// Developer testing endpoints
app.route('/dev', devRoute);

// Push notification endpoint
app.route('/', notifyRoute);

// Simulator inbound endpoint (auth-gated in production)
app.route('/', simulateRoute);

// Webhook endpoints
app.route('/webhooks', whatsappWebhook);
app.route('/webhooks', voiceWebhook);
app.route('/webhooks', socialWebhook);
app.route('/webhooks', googleWebhook);

// Root greeting
app.get('/', (c) => {
  return c.json({
    service: 'dental-agent',
    status: 'ok',
    version: '0.0.0',
  });
});

const port = config.AGENT_PORT;

// Only bind HTTP listener when not in test suite or Vercel serverless function
if (process.env['NODE_ENV'] !== 'test' && !process.env['VERCEL']) {
  console.log(`🤖 Dental AI Agent listening on http://localhost:${port}`);
  console.log(`   LLM Provider:  ${config.LLM_PROVIDER}`);
  console.log(`   Session Store: ${config.SESSION_STORE}`);
  serve({ fetch: app.fetch, port });

  // Start appointment reminder scheduler
  startReminderScheduler();
}

export { app };
export default Object.assign(app, { fetch: app.fetch.bind(app) });

