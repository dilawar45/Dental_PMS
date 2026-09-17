import { NotImplementedError, type LLMProvider, type LLMResponse, type Message, type ToolSpec } from './base';

export class GeminiLLMProvider implements LLMProvider {
  async complete(
    _messages: Message[],
    _tools?: ToolSpec[],
    _system?: string
  ): Promise<LLMResponse> {
    throw new NotImplementedError('Real LLM adapter not yet configured.');
  }
}
