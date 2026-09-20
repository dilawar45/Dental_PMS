import type { SmsProvider } from './interface';
import { getDefaultDb, type Database } from '@dental-pms/db';
import { MockSmsProvider } from './mock';
import { RealSmsProvider } from './real';

export type { SmsProvider } from './interface';

/**
 * Factory: returns the active SMS provider based on SMS_PROVIDER env var.
 * Defaults to 'mock' if unset.
 */
export function getSmsProvider(db?: Database): SmsProvider {
  const mode = process.env['SMS_PROVIDER'] ?? 'mock';
  const activeDb = db ?? getDefaultDb();

  switch (mode) {
    case 'mock':
      return new MockSmsProvider(activeDb);
    case 'real':
    case 'twilio':
    case 'telenor':
    case 'jazz':
      return new RealSmsProvider();
    default:
      throw new Error(`Unknown SMS_PROVIDER: "${mode}". Use "mock", "twilio", or "telenor".`);
  }
}
