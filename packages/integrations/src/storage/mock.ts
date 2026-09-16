import type { StorageProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock storage provider — logs operations to dev_outbox, stores nothing.
 */
export class MockStorageProvider implements StorageProvider {
  constructor(private db: Database) {}

  async upload(bucket: string, key: string, data: Buffer | Uint8Array): Promise<{ url: string }> {
    const url = `mock://storage/${bucket}/${key}`;
    await this.db.insert(devOutbox).values({
      channel: 'storage',
      from: 'system',
      to: `${bucket}/${key}`,
      body: `[upload] ${data.length} bytes`,
      provider: 'mock',
      direction: 'outbound',
    });
    console.log(`[MockStorage] upload → ${bucket}/${key} (${data.length} bytes)`);
    return { url };
  }

  async getSignedUrl(bucket: string, key: string, _expiresIn?: number): Promise<{ url: string }> {
    const url = `mock://storage/${bucket}/${key}?signed=true`;
    console.log(`[MockStorage] getSignedUrl → ${bucket}/${key}`);
    return { url };
  }

  async delete(bucket: string, key: string): Promise<void> {
    console.log(`[MockStorage] delete → ${bucket}/${key}`);
  }
}
