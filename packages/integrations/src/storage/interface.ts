/**
 * Storage provider interface (Supabase Storage, S3, etc.).
 */
export interface StorageProvider {
  /** Upload a file to a bucket. */
  upload(bucket: string, key: string, data: Buffer | Uint8Array): Promise<{ url: string }>;

  /** Get a time-limited signed URL for a file. */
  getSignedUrl(bucket: string, key: string, expiresIn?: number): Promise<{ url: string }>;

  /** Delete a file from a bucket. */
  delete(bucket: string, key: string): Promise<void>;
}
