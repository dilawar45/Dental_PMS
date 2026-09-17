import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index';

/**
 * Create a database client from a connection URL.
 * Uses the `postgres` driver with Drizzle ORM.
 */
export function createDb(url: string) {
  const client = postgres(url, {
    ssl: url.includes('localhost') ? false : 'require',
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema });
}

/** Re-export the full schema for consumer convenience. */
export { schema };

/** DB client type for use in function signatures. */
export type Database = ReturnType<typeof createDb>;

/** Transaction client type passed to withClinic callbacks. */
export type ClinicTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

let defaultDb: Database | null = null;

/**
 * Get or create the singleton DB client using DATABASE_URL.
 */
export function getDefaultDb(): Database {
  if (!defaultDb) {
    const url =
      process.env['DATABASE_URL'] ||
      'postgresql://postgres.rxoqmiwuwkywxxtkyjma:PostgreDbase@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
    defaultDb = createDb(url);
  }
  return defaultDb;
}

/**
 * Execute operations within a tenant-scoped transaction.
 * Runs `SET LOCAL ROLE authenticated; SET LOCAL app.clinic_id = <clinicId>` to enforce Row-Level Security policies.
 */
export async function withClinic<T>(
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>
): Promise<T>;
export async function withClinic<T>(
  db: Database,
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>
): Promise<T>;
export async function withClinic<T>(
  first: Database | string,
  second: string | ((tx: ClinicTransaction) => Promise<T>),
  third?: (tx: ClinicTransaction) => Promise<T>
): Promise<T> {
  let db: Database;
  let clinicId: string;
  let fn: (tx: ClinicTransaction) => Promise<T>;

  if (typeof first === 'string') {
    db = getDefaultDb();
    clinicId = first;
    fn = second as (tx: ClinicTransaction) => Promise<T>;
  } else {
    db = first;
    clinicId = second as string;
    fn = third as (tx: ClinicTransaction) => Promise<T>;
  }

  return await db.transaction(async (tx) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)) {
      throw new Error(`Invalid clinicId UUID: ${clinicId}`);
    }
    await tx.execute(
      sql.raw(`SET LOCAL ROLE authenticated; SET LOCAL app.clinic_id = '${clinicId}';`)
    );
    return await fn(tx);
  });
}

