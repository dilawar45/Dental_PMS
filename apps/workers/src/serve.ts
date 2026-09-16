import { serve } from 'inngest/hono';
import { Hono } from 'hono';
import { serve as serveHttp } from '@hono/node-server';
import { inngest } from './client';
import { processOutbox } from './functions/process-outbox';

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'dental-pms-workers' }));

// Inngest serve endpoint
app.on(
  ['GET', 'POST', 'PUT'],
  '/api/inngest',
  serve({
    client: inngest,
    functions: [processOutbox],
  }),
);

const port = parseInt(process.env['WORKERS_PORT'] ?? '3001', 10);

console.log(`🔧 Workers server starting on port ${port}`);
serveHttp({ fetch: app.fetch, port });
