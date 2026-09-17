import { config } from './config';
import { getLLMProvider } from './llm/factory';
import { getSessionStore } from './session/factory';
import { AgentRunner } from './agent/runner';
import type { LLMProvider } from './llm/base';
import type { SessionStore } from './session/base';

let defaultRunner: AgentRunner | null = null;

export function getAgentRunner(
  customLlm?: LLMProvider,
  customSessionStore?: SessionStore
): AgentRunner {
  if (customLlm || customSessionStore) {
    const llm = customLlm ?? getLLMProvider();
    const store = customSessionStore ?? getSessionStore();
    return new AgentRunner(llm, store);
  }

  if (!defaultRunner) {
    const llm = getLLMProvider(config.LLM_PROVIDER);
    const store = getSessionStore(config.SESSION_STORE);
    defaultRunner = new AgentRunner(llm, store);
  }

  return defaultRunner;
}
