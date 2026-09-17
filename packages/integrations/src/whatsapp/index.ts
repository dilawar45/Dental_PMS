import type { WhatsAppProvider } from './interface';
import { getDefaultDb, type Database } from '@dental-pms/db';
import { MockWhatsAppProvider } from './mock';
import { RealWhatsAppProvider } from './real';

export type { WhatsAppProvider } from './interface';

/**
 * Factory: returns the active WhatsApp provider based on WHATSAPP_PROVIDER env var.
 * Defaults to 'mock' if unset.
 */
export function getWhatsAppProvider(db?: Database): WhatsAppProvider {
  const mode = process.env['WHATSAPP_PROVIDER'] ?? 'mock';
  const activeDb = db ?? getDefaultDb();

  switch (mode) {
    case 'mock':
      return new MockWhatsAppProvider(activeDb);
    case 'real':
    case 'meta':
      return new RealWhatsAppProvider();
    default:
      throw new Error(`Unknown WHATSAPP_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
