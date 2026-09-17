/**
 * Conversation turn runner orchestrating Session, LLM, and Tool dispatch.
 */

import { config } from '../config';
import type { LLMProvider, Message } from '../llm/base';
import { NotImplementedError } from '../llm/base';
import type { Session, SessionStore } from '../session/base';
import { TOOL_REGISTRY, dispatchTool } from './registry';
import { getSystemPrompt } from './system-prompt';

export interface InboundParams {
  channel: string;
  sender: string;
  body: string;
  conversation_id?: string;
  clinic_id?: string;
}

export interface InboundResult {
  reply: string;
  tool_intent: string | null;
  tool_intents: string[];
  session_id: string;
  channel: string;
  logged: boolean;
}

export class AgentRunner {
  constructor(
    private readonly llm: LLMProvider,
    private readonly sessionStore: SessionStore
  ) {}

  async handleInbound(params: InboundParams): Promise<InboundResult> {
    const { channel, sender, body, conversation_id, clinic_id } = params;
    const convId = conversation_id || `${channel}:${sender}`;
    const activeClinicId = clinic_id || config.DEFAULT_CLINIC_ID;

    // 1. Fetch or initialize session
    let session = await this.sessionStore.get(convId);
    if (!session) {
      session = {
        conversation_id: convId,
        channel,
        clinic_id: activeClinicId,
        history: [],
      };
    }

    // 2. Append user message to session history
    session.history.push({
      role: 'user',
      content: body,
      timestamp: new Date().toISOString(),
    });

    // 3. Assemble prompt context for LLM
    const systemPrompt = getSystemPrompt();
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...session.history.map((msg) => ({
        role: msg.role,
        content: msg.content,
        tool_call_id: msg.tool_call_id,
        name: msg.name,
      })),
    ];

    // 4. Generate response via configured LLM provider
    const availableTools = Object.values(TOOL_REGISTRY);
    const response = await this.llm.complete(messages, availableTools, systemPrompt);

    const executedTools: string[] = [];
    const toolCalls = response.tool_calls || response.toolCalls || [];

    const toolContext = {
      clinic_id: activeClinicId,
      session_id: convId,
      channel,
      sender,
      from: sender,
    };

    // 5. Dispatch tools (in Phase 5A, dispatch catches NotImplementedError and logs intent)
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        executedTools.push(tc.name);
        try {
          await dispatchTool(tc.name, tc.arguments, toolContext);
        } catch (err) {
          if (err instanceof NotImplementedError) {
            console.log(`[Phase 5A Intent] Tool '${tc.name}' intent recognized.`);
          } else {
            console.error(`Tool '${tc.name}' execution error:`, err);
          }
        }
      }
    }

    const replyText =
      response.text ||
      'Hello! I am the AI Receptionist at Bright Smile Dental. How can I assist you with your dental care today?';

    // 6. Append assistant message to session history
    session.history.push({
      role: 'assistant',
      content: replyText,
      timestamp: new Date().toISOString(),
    });

    // 7. Persist updated session
    await this.sessionStore.set(session);

    const primaryTool = executedTools.length > 0 ? (executedTools[0] ?? null) : null;

    return {
      reply: replyText,
      tool_intent: primaryTool,
      tool_intents: executedTools,
      session_id: convId,
      channel,
      logged: true,
    };
  }
}
