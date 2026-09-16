import type { StorageProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { MockStorageProvider } from './mock';
import { RealStorageProvider } from './real';

export type { StorageProvider } from './interface';

/**
 * Factory: returns the active storage provider based on STORAGE_PROVIDER env var.
 */
export function getStorageProvider(db: Database): StorageProvider {
  const mode = process.env['STORAGE_PROVIDER'] ?? 'mock';

  switch (mode) {
    case 'mock':
      return new MockStorageProvider(db);
    case 'real':
      return new RealStorageProvider();
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
