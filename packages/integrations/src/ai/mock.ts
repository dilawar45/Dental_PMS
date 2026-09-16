import type { AiProvider, AiMessage, AiCompletionOptions, AiUsage } from './interface';
import type { Database } from '@dental-pms/db';
import { devOutbox } from '@dental-pms/db/schema';

/**
 * Mock AI provider — returns canned responses, logs to dev_outbox, no API calls.
 */
export class MockAiProvider implements AiProvider {
  constructor(private db: Database) {}

  async complete(
    messages: AiMessage[],
    _options?: AiCompletionOptions,
  ): Promise<{ content: string; usage?: AiUsage }> {
    const lastMessage = messages[messages.length - 1];
    const content = `[MockAI] Echo: ${lastMessage?.content ?? '(empty)'}`;

    await this.db.insert(devOutbox).values({
      channel: 'ai',
      from: 'system',
      to: 'ai-completion',
      body: content,
      provider: 'mock',
      direction: 'outbound',
      metadata: JSON.stringify({ messageCount: messages.length }),
    });
    console.log(`[MockAI] complete → ${messages.length} messages`);

    return {
      content,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
    };
  }

  async embed(text: string): Promise<{ embedding: number[] }> {
    console.log(`[MockAI] embed → ${text.length} chars`);
    // Return a fake 8-dimensional embedding
    return {
      embedding: Array.from({ length: 8 }, () => Math.random()),
    };
  }
}
