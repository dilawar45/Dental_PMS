import { createDb } from '@dental-pms/db';

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

export const db =
  globalForDb.db ??
  createDb(
    process.env['DATABASE_URL'] ||
      'postgresql://postgres.rxoqmiwuwkywxxtkyjma:PostgreDbase@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres'
  );

if (process.env['NODE_ENV'] !== 'production') {
  globalForDb.db = db;
}
