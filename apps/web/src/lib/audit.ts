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

import { sql } from 'drizzle-orm';

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
 * In support mode, automatically resolves real super-admin actor and stamps
 * impersonated_user_id into meta.
 */
export async function logAudit(
  tx: ClinicTransaction,
  params: LogAuditParams
): Promise<void> {
  let actorId = params.actorId ?? null;
  const meta: Record<string, unknown> = { ...(params.meta ?? {}) };

  try {
    const settings = await tx.execute(
      sql`SELECT current_setting('app.support_mode', true) AS support_mode,
                 current_setting('app.real_actor_id', true) AS real_actor,
                 current_setting('app.impersonated_user_id', true) AS impersonated;`
    );

    const row = settings[0];
    if (row && row['support_mode'] === 'true') {
      if (row['real_actor']) {
        actorId = String(row['real_actor']);
      }
      if (row['impersonated']) {
        meta['impersonated_user_id'] = String(row['impersonated']);
      }
    }
  } catch {
    // If settings fail to resolve, fallback to passed params
  }

  await tx.insert(auditLog).values({
    clinicId: params.clinicId,
    actorId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId ?? null,
    meta,
  });
}
