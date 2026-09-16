import { auditLog } from '@dental-pms/db/schema';
import type { ClinicTransaction } from '@dental-pms/db';

export type AuditAction =
  | 'patient.create'
  | 'patient.update'
  | 'patient.archive'
  | 'patient.restore'
  | 'consent.grant'
  | 'consent.revoke'
  | 'file.upload'
  | 'file.delete'
  | 'appointment.create'
  | 'appointment.update'
  | 'appointment.status_change'
  | 'booking_request.approve'
  | 'booking_request.reject'
  | 'booking_request.link_patient'
  | 'invoice.create'
  | 'invoice.update'
  | 'invoice.void'
  | 'receipt.create'
  | 'receipt.pdf_generated'
  | 'charting.entry_created'
  | 'charting.batch_created'
  | 'charting.pdf_exported';

export type AuditEntity =
  | 'patient'
  | 'consent'
  | 'file'
  | 'appointment'
  | 'booking_request'
  | 'invoice'
  | 'receipt'
  | 'charting_entry';

export interface LogAuditParams {
  clinicId: string;
  actorId?: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Logs a deterministic audit event into the tenant's immutable audit_log.
 * Must be called inside a `withClinic` transaction scope.
 */
export async function logAudit(
  tx: ClinicTransaction,
  params: LogAuditParams
): Promise<void> {
  await tx.insert(auditLog).values({
    clinicId: params.clinicId,
    actorId: params.actorId ?? null,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    meta: params.meta ?? {},
  });
}
