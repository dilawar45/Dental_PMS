import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema';

/**
 * Create a database client from a connection URL.
 * Uses the `postgres` driver with Drizzle ORM.
 */
export function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

/** Re-export the full schema for consumer convenience. */
export { schema };

/** DB client type for use in function signatures. */
export type Database = ReturnType<typeof createDb>;

/** Transaction client type passed to withClinic callbacks. */
export type ClinicTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Execute operations within a tenant-scoped transaction.
 * Runs `SET LOCAL app.clinic_id = <clinicId>` to enforce Row-Level Security policies.
 */
export async function withClinic<T>(
  db: Database,
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>
): Promise<T> {
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
