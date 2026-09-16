import { inngest } from '../client';

/**
 * Placeholder Inngest function — processes dev_outbox entries.
 * Will be extended to dispatch messages via real providers when configured.
 */
export const processOutbox = inngest.createFunction(
  { id: 'process-outbox', name: 'Process Dev Outbox' },
  { event: 'outbox/process' },
  async ({ event, step }) => {
    await step.run('log-event', async () => {
      console.log('[processOutbox] Received event:', event.data);
      return { processed: true };
    });

    return { status: 'ok' };
  },
);
