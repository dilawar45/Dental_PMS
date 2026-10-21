import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as schema from './schema/index';

/**
 * Create a database client from a connection URL.
 * Uses the `postgres` driver with Drizzle ORM.
 */
export function createDb(url: string) {
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  const client = postgres(url, {
    ssl: isLocal ? false : 'require',
    max: 10,
    idle_timeout: 300, // Keep idle connections open for 5 min to avoid cold TCP+TLS handshake latency
    connect_timeout: 15,
    max_lifetime: 60 * 30, // 30 min connection recycling
    prepare: false,
  });
  return drizzle(client, { schema });
}

/** Re-export the full schema for consumer convenience. */
export { schema };
export * from './support-mode';
export * from './slots';

/** DB client type for use in function signatures. */
export type Database = ReturnType<typeof createDb>;

/** Transaction client type passed to withClinic callbacks. */
export type ClinicTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

let defaultDb: Database | null = null;

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(value: string, name: string): void {
  if (!UUID_REGEX.test(value)) {
    throw new Error(`Invalid ${name} UUID: ${value}`);
  }
}

/**
 * Get or create the singleton DB client using DATABASE_URL.
 */
export function getDefaultDb(): Database {
  if (!defaultDb) {
    const url = process.env['DATABASE_URL'];
    if (!url) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    defaultDb = createDb(url);
  }
  return defaultDb;
}

export interface SupportModeOptions {
  actorId?: string;
  supportMode?: boolean;
  realActorId?: string;
  impersonatedUserId?: string;
}

export interface PlatformAdminOptions {
  actorId?: string;
}

/**
 * Execute operations within a tenant-scoped transaction.
 * Runs `SET LOCAL ROLE authenticated; SET LOCAL app.clinic_id = <clinicId>` to enforce Row-Level Security policies.
 * When support mode is active, also sets app.support_mode, app.real_actor_id, app.impersonated_user_id, and app.actor_id.
 */
export async function withClinic<T>(
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>,
  options?: SupportModeOptions
): Promise<T>;
export async function withClinic<T>(
  db: Database,
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>,
  options?: SupportModeOptions
): Promise<T>;
export async function withClinic<T>(
  first: Database | string,
  second: string | ((tx: ClinicTransaction) => Promise<T>),
  third?: ((tx: ClinicTransaction) => Promise<T>) | SupportModeOptions,
  fourth?: SupportModeOptions
): Promise<T> {
  let db: Database;
  let clinicId: string;
  let fn: (tx: ClinicTransaction) => Promise<T>;
  let options: SupportModeOptions | undefined;

  if (typeof first === 'string') {
    db = getDefaultDb();
    clinicId = first;
    fn = second as (tx: ClinicTransaction) => Promise<T>;
    options = third as SupportModeOptions | undefined;
  } else {
    db = first;
    clinicId = second as string;
    fn = third as (tx: ClinicTransaction) => Promise<T>;
    options = fourth;
  }

  return await db.transaction(async (tx) => {
    assertUuid(clinicId, 'clinicId');

    const sqlStatements = [
      `SET LOCAL ROLE authenticated;`,
      `SET LOCAL app.clinic_id = '${clinicId}';`,
    ];

    if (options?.actorId) {
      assertUuid(options.actorId, 'actorId');
      sqlStatements.push(`SET LOCAL app.actor_id = '${options.actorId}';`);
    }

    if (options?.supportMode) {
      sqlStatements.push(`SET LOCAL app.support_mode = 'true';`);
      if (options.realActorId) {
        assertUuid(options.realActorId, 'realActorId');
        sqlStatements.push(`SET LOCAL app.real_actor_id = '${options.realActorId}';`);
        if (!options.actorId) {
          sqlStatements.push(`SET LOCAL app.actor_id = '${options.realActorId}';`);
        }
      }
      if (options.impersonatedUserId) {
        assertUuid(options.impersonatedUserId, 'impersonatedUserId');
        sqlStatements.push(`SET LOCAL app.impersonated_user_id = '${options.impersonatedUserId}';`);
      }
    }

    await tx.execute(sql.raw(sqlStatements.join(' ')));
    return await fn(tx);
  });
}

/**
 * Execute operations within a platform super-admin transaction.
 * Runs `SET LOCAL ROLE authenticated; SET LOCAL app.is_super_admin = 'true'; SET LOCAL app.actor_id = <actorId>`.
 */
export async function withPlatformAdmin<T>(
  fn: (tx: ClinicTransaction) => Promise<T>,
  options?: PlatformAdminOptions
): Promise<T>;
export async function withPlatformAdmin<T>(
  db: Database,
  fn: (tx: ClinicTransaction) => Promise<T>,
  options?: PlatformAdminOptions
): Promise<T>;
export async function withPlatformAdmin<T>(
  first: Database | ((tx: ClinicTransaction) => Promise<T>),
  second?: ((tx: ClinicTransaction) => Promise<T>) | PlatformAdminOptions,
  third?: PlatformAdminOptions
): Promise<T> {
  let db: Database;
  let fn: (tx: ClinicTransaction) => Promise<T>;
  let options: PlatformAdminOptions | undefined;

  if (typeof first === 'function') {
    db = getDefaultDb();
    fn = first;
    options = second as PlatformAdminOptions | undefined;
  } else {
    db = first;
    fn = second as (tx: ClinicTransaction) => Promise<T>;
    options = third;
  }

  return await db.transaction(async (tx) => {
    const sqlStatements = [
      `SET LOCAL ROLE authenticated;`,
      `SET LOCAL app.is_super_admin = 'true';`,
    ];
    if (options?.actorId) {
      assertUuid(options.actorId, 'actorId');
      sqlStatements.push(`SET LOCAL app.actor_id = '${options.actorId}';`);
    }
    await tx.execute(sql.raw(sqlStatements.join(' ')));
    return await fn(tx);
  });
}


