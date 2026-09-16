import type { AiProvider } from './interface';
import type { Database } from '@dental-pms/db';
import { MockAiProvider } from './mock';
import { RealAiProvider } from './real';

export type { AiProvider, AiMessage, AiCompletionOptions, AiUsage } from './interface';

/**
 * Factory: returns the active AI provider based on AI_PROVIDER env var.
 */
export function getAiProvider(db: Database): AiProvider {
  const mode = process.env['AI_PROVIDER'] ?? 'mock';

  switch (mode) {
    case 'mock':
      return new MockAiProvider(db);
    case 'real':
      return new RealAiProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER: "${mode}". Use "mock" or "real".`);
  }
}
