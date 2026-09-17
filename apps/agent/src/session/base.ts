/**
 * Session store base models and abstract interface.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
  timestamp?: string;
}

export interface Session {
  conversation_id: string;
  channel: string;
  patient_id?: string | null;
  clinic_id?: string | null;
  history: ChatMessage[];
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
}

export interface SessionStore {
  get(conversationId: string): Promise<Session | null>;
  set(session: Session, ttlSeconds?: number): Promise<void>;
  delete(conversationId: string): Promise<boolean>;
}
