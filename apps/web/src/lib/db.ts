import { createDb } from '@dental-pms/db';

const globalForDb = globalThis as unknown as { db?: ReturnType<typeof createDb> };

function getDbClient(): ReturnType<typeof createDb> {
  if (globalForDb.db) {
    return globalForDb.db;
  }

  const dbUrl =
    process.env['DATABASE_URL'] ||
    'postgresql://postgres:postgres@localhost:5432/postgres';

  const client = createDb(dbUrl);
  globalForDb.db = client;
  return client;
}

// Lazy proxy: only initializes the connection when an actual query is invoked at runtime.
// This prevents Next.js static page bundling from crashing at build time.
export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    const client = getDbClient();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
