import type { Session, SessionStore } from './base';

export class MemorySessionStore implements SessionStore {
  private readonly store = new Map<string, Session>();
  private readonly maxTurns: number;

  constructor(maxTurns: number = 20) {
    this.maxTurns = maxTurns;
  }

  async get(conversationId: string): Promise<Session | null> {
    const session = this.store.get(conversationId);
    if (!session) {
      return null;
    }
    // Deep clone to prevent direct external mutation
    return JSON.parse(JSON.stringify(session)) as Session;
  }

  async set(session: Session, _ttlSeconds: number = 86400): Promise<void> {
    // Sliding window: enforce maximum history turns
    if (session.history.length > this.maxTurns) {
      session.history = session.history.slice(-this.maxTurns);
    }
    session.updated_at = new Date().toISOString();
    session.last_message_at = new Date().toISOString();

    this.store.set(session.conversation_id, JSON.parse(JSON.stringify(session)) as Session);
  }

  async delete(conversationId: string): Promise<boolean> {
    return this.store.delete(conversationId);
  }
}
