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
export * from './support-mode';
export * from './slots';

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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clinicId)) {
      throw new Error(`Invalid clinicId UUID: ${clinicId}`);
    }

    const sqlStatements = [
      `SET LOCAL ROLE authenticated;`,
      `SET LOCAL app.clinic_id = '${clinicId}';`,
    ];

    if (options?.actorId) {
      sqlStatements.push(`SET LOCAL app.actor_id = '${options.actorId}';`);
    }

    if (options?.supportMode) {
      sqlStatements.push(`SET LOCAL app.support_mode = 'true';`);
      if (options.realActorId) {
        sqlStatements.push(`SET LOCAL app.real_actor_id = '${options.realActorId}';`);
        if (!options.actorId) {
          sqlStatements.push(`SET LOCAL app.actor_id = '${options.realActorId}';`);
        }
      }
      if (options.impersonatedUserId) {
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
      sqlStatements.push(`SET LOCAL app.actor_id = '${options.actorId}';`);
    }
    await tx.execute(sql.raw(sqlStatements.join(' ')));
    return await fn(tx);
  });
}


