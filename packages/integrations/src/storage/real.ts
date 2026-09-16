import type { StorageProvider } from './interface';

/**
 * Real storage provider stub — throws until Supabase/S3 credentials are configured.
 */
export class RealStorageProvider implements StorageProvider {
  async upload(_bucket: string, _key: string, _data: Buffer | Uint8Array): Promise<{ url: string }> {
    throw new Error('Storage provider not configured. Set storage credentials to enable.');
  }

  async getSignedUrl(_bucket: string, _key: string, _expiresIn?: number): Promise<{ url: string }> {
    throw new Error('Storage provider not configured. Set storage credentials to enable.');
  }

  async delete(_bucket: string, _key: string): Promise<void> {
    throw new Error('Storage provider not configured. Set storage credentials to enable.');
  }
}
