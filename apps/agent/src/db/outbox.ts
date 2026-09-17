import { getDefaultDb, schema } from '@dental-pms/db';

export interface DevOutboxInsertParams {
  channel: string;
  from: string;
  to: string;
  body: string;
  provider?: string;
  direction: 'inbound' | 'outbound';
  metadata?: string | null;
}

/**
 * Log message traffic to dev_outbox table for observability and audit tracking.
 */
export async function logDevOutbox(params: DevOutboxInsertParams): Promise<void> {
  const db = getDefaultDb();
  await db.insert(schema.devOutbox).values({
    channel: params.channel,
    from: params.from,
    to: params.to,
    body: params.body,
    provider: params.provider ?? 'mock',
    direction: params.direction,
    metadata: params.metadata ?? null,
  });
}
