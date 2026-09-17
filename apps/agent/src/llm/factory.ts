import { config } from '../config';
import type { LLMProvider } from './base';
import { MockLLMProvider } from './mock';
import { ClaudeLLMProvider } from './claude';
import { GeminiLLMProvider } from './gemini';

export function getLLMProvider(provider?: string): LLMProvider {
  const selected = (provider || config.LLM_PROVIDER).toLowerCase();

  switch (selected) {
    case 'mock':
      return new MockLLMProvider();
    case 'claude':
      return new ClaudeLLMProvider();
    case 'gemini':
      return new GeminiLLMProvider();
    default:
      throw new Error(`Unknown LLM provider: '${selected}'. Available: mock, claude, gemini`);
  }
}
