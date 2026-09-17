/**
 * Base interfaces and schemas for LLM provider abstraction.
 */

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  text?: string;
  tool_calls?: ToolCall[];
  toolCalls?: ToolCall[];
}

export class NotImplementedError extends Error {
  constructor(message: string = 'Not implemented.') {
    super(message);
    this.name = 'NotImplementedError';
  }
}

export interface LLMProvider {
  complete(
    messages: Message[],
    tools?: ToolSpec[],
    system?: string
  ): Promise<LLMResponse>;
}
