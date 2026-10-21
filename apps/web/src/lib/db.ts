import { createDb } from '@dental-pms/db';

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

const dbUrl = process.env['DATABASE_URL'];
if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

export const db = globalForDb.db ?? createDb(dbUrl);
globalForDb.db = db;
