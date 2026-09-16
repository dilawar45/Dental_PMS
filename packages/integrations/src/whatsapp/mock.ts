import { randomUUID } from 'crypto';
import type { WhatsAppProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock WhatsApp provider.
 * Logs messages to the dev_outbox table — no network calls.
 */
export class MockWhatsAppProvider implements WhatsAppProvider {
  constructor(private db: Database) {}

  async sendMessage(to: string, body: string): Promise<{ messageId: string }> {
    const messageId = randomUUID();
    await this.db.insert(devOutbox).values({
      channel: 'whatsapp',
      from: 'system',
      to,
      body,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockWhatsApp] sendMessage → ${to}: ${body}`);
    return { messageId };
  }

  async sendTemplate(
    to: string,
    templateId: string,
    params: Record<string, string>,
  ): Promise<{ messageId: string }> {
    const messageId = randomUUID();
    await this.db.insert(devOutbox).values({
      channel: 'whatsapp',
      from: 'system',
      to,
      body: `[template:${templateId}] ${JSON.stringify(params)}`,
      provider: 'mock',
      direction: 'outbound',
      metadata: JSON.stringify({ templateId, params }),
    });
    console.log(`[MockWhatsApp] sendTemplate → ${to}: ${templateId}`);
    return { messageId };
  }
}
