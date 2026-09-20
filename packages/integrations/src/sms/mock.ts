import { randomUUID } from 'crypto';
import type { SmsProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock SMS provider.
 * Logs messages to the dev_outbox table — no real network calls.
 */
export class MockSmsProvider implements SmsProvider {
  constructor(private db: Database) {}

  async send(to: string, message: string): Promise<{ messageId: string }> {
    const messageId = randomUUID();
    await this.db.insert(devOutbox).values({
      channel: 'sms',
      from: 'system',
      to,
      body: message,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockSMS] send → ${to}: ${message}`);
    return { messageId };
  }
}
