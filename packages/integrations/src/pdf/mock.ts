import type { PdfProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock PDF provider — logs generation to dev_outbox, returns a placeholder buffer.
 */
export class MockPdfProvider implements PdfProvider {
  constructor(private db: Database) {}

  async generate(template: string, data: Record<string, unknown>): Promise<Buffer> {
    await this.db.insert(devOutbox).values({
      channel: 'pdf',
      from: 'system',
      to: template,
      body: `[generate] template=${template}`,
      provider: 'mock',
      direction: 'outbound',
      metadata: JSON.stringify(data),
    });
    console.log(`[MockPdf] generate → template=${template}`);
    return Buffer.from(`%PDF-1.4 mock for template: ${template}`);
  }

  async merge(buffers: Buffer[]): Promise<Buffer> {
    console.log(`[MockPdf] merge → ${buffers.length} documents`);
    return Buffer.concat(buffers);
  }
}
