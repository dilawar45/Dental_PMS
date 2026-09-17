import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { config } from '../config';

/**
 * Resolves clinic_id from the agent execution context.
 * Falls back to DEFAULT_CLINIC_ID from environment.
 */
export function getClinicIdFromContext(ctx?: Record<string, unknown>): string {
  if (ctx && typeof ctx['clinic_id'] === 'string' && ctx['clinic_id'].trim().length > 0) {
    return ctx['clinic_id'].trim();
  }
  return config.DEFAULT_CLINIC_ID;
}

/**
 * Tenant-scoped transaction executor that enforces Row-Level Security (RLS)
 * via PostgreSQL session variables (SET LOCAL app.clinic_id).
 *
 * Thin wrapper around packages/db's withClinic.
 */
export async function runInClinic<T>(
  clinicId: string,
  fn: (tx: ClinicTransaction) => Promise<T>
): Promise<T> {
  return await withClinic(clinicId, fn);
}

export type { ClinicTransaction };
