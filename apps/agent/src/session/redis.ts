import Redis from 'ioredis';
import type { Session, SessionStore } from './base';

export class RedisSessionStore implements SessionStore {
  private readonly client: Redis;
  private readonly prefix: string;
  private readonly maxTurns: number;

  constructor(redisUrl: string, prefix: string = 'dental_session:', maxTurns: number = 20) {
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.prefix = prefix;
    this.maxTurns = maxTurns;
  }

  async get(conversationId: string): Promise<Session | null> {
    const raw = await this.client.get(this.prefix + conversationId);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as Session;
  }

  async set(session: Session, ttlSeconds: number = 86400): Promise<void> {
    if (session.history.length > this.maxTurns) {
      session.history = session.history.slice(-this.maxTurns);
    }
    session.updated_at = new Date().toISOString();
    session.last_message_at = new Date().toISOString();

    const key = this.prefix + session.conversation_id;
    await this.client.set(key, JSON.stringify(session), 'EX', ttlSeconds);
  }

  async delete(conversationId: string): Promise<boolean> {
    const count = await this.client.del(this.prefix + conversationId);
    return count > 0;
  }
}
