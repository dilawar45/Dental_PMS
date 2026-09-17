import { auditLog } from '@dental-pms/db/schema';
import type { ClinicTransaction } from './context';

export interface AuditLogEntry {
  action: string;
  entity: string;
  entityId?: string | null;
  meta?: Record<string, unknown> | null;
  actorId?: string | null;
}

/**
 * Record an audit log entry within a tenant-scoped transaction.
 */
export async function writeAuditLog(
  tx: ClinicTransaction,
  clinicId: string,
  entry: AuditLogEntry
): Promise<void> {
  await tx.insert(auditLog).values({
    clinicId,
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    meta: entry.meta ?? {},
  });
}
