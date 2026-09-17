import { Hono } from 'hono';
import { config } from '../config';

export const healthRoute = new Hono();

healthRoute.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'dental-agent',
    llm_provider: config.LLM_PROVIDER,
    session_store: config.SESSION_STORE,
  });
});
