import { config as loadDotenv } from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load .env from monorepo root and local package directory
loadDotenv({ path: path.resolve(process.cwd(), '../../.env') });
loadDotenv({ path: path.resolve(process.cwd(), '.env') });
loadDotenv();

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  AGENT_PORT: z.coerce.number().default(8000),
  LLM_PROVIDER: z.enum(['mock', 'claude', 'gemini']).default('mock'),
  SESSION_STORE: z.enum(['memory', 'redis']).default('memory'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  DEFAULT_CLINIC_ID: z.string().default('b398700a-f746-4a45-afc0-b1020cda02a8'),
  DATABASE_URL: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;

export const config = configSchema.parse({
  NODE_ENV: process.env['NODE_ENV'],
  AGENT_PORT: process.env['AGENT_PORT'] ?? 8000,
  LLM_PROVIDER: process.env['LLM_PROVIDER'],
  SESSION_STORE: process.env['SESSION_STORE'],
  REDIS_URL: process.env['REDIS_URL'],
  DEFAULT_CLINIC_ID: process.env['DEFAULT_CLINIC_ID'] || 'b398700a-f746-4a45-afc0-b1020cda02a8',
  DATABASE_URL: process.env['DATABASE_URL'],
});
