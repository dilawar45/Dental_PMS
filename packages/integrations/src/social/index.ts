import type { SocialProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { MockSocialProvider } from './mock';
import { RealSocialProvider } from './real';

export type { SocialProvider, SocialMention } from './interface';

/**
 * Factory: returns the active social provider based on SOCIAL_PROVIDER env var.
 */
export function getSocialProvider(db: Database): SocialProvider {
  const mode = process.env['SOCIAL_PROVIDER'] ?? 'mock';

  switch (mode) {
    case 'mock':
      return new MockSocialProvider(db);
    case 'real':
      return new RealSocialProvider();
    default:
      throw new Error(`Unknown SOCIAL_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
