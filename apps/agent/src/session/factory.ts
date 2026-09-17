import { config } from '../config';
import type { SessionStore } from './base';
import { MemorySessionStore } from './memory';
import { RedisSessionStore } from './redis';

export function getSessionStore(storeType?: string): SessionStore {
  const selected = (storeType || config.SESSION_STORE).toLowerCase();

  switch (selected) {
    case 'memory':
      return new MemorySessionStore();
    case 'redis':
      return new RedisSessionStore(config.REDIS_URL);
    default:
      throw new Error(`Unknown session store: '${selected}'. Available: memory, redis`);
  }
}
