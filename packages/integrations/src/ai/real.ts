import type { AiProvider, AiMessage, AiCompletionOptions, AiUsage } from './interface';

/**
 * Real AI provider stub — throws until API key is configured.
 */
export class RealAiProvider implements AiProvider {
  async complete(
    _messages: AiMessage[],
    _options?: AiCompletionOptions,
  ): Promise<{ content: string; usage?: AiUsage }> {
    throw new Error('AI provider not configured. Set ANTHROPIC_API_KEY to enable.');
  }

  async embed(_text: string): Promise<{ embedding: number[] }> {
    throw new Error('AI provider not configured. Set ANTHROPIC_API_KEY to enable.');
  }
}
