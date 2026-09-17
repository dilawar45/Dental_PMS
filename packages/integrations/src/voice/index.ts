import type { VoiceProvider } from './interface';
import { getDefaultDb, type Database } from '@dental-pms/db';
import { MockVoiceProvider } from './mock';
import { RealVoiceProvider } from './real';

export type { VoiceProvider } from './interface';

/**
 * Factory: returns the active voice provider based on VOICE_PROVIDER env var.
 */
export function getVoiceProvider(db?: Database): VoiceProvider {
  const mode = process.env['VOICE_PROVIDER'] ?? 'mock';
  const activeDb = db ?? getDefaultDb();

  switch (mode) {
    case 'mock':
      return new MockVoiceProvider(activeDb);
    case 'real':
      return new RealVoiceProvider();
    default:
      throw new Error(`Unknown VOICE_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
