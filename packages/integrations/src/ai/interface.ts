/**
 * AI provider interface (Claude, OpenAI, etc.).
 */
export interface AiProvider {
  /** Run a chat completion with a list of messages. */
  complete(
    messages: AiMessage[],
    options?: AiCompletionOptions,
  ): Promise<{ content: string; usage?: AiUsage }>;

  /** Generate an embedding vector for a text input. */
  embed(text: string): Promise<{ embedding: number[] }>;
}

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
