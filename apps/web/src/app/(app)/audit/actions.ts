'use server';

import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { auditLog, users } from '@dental-pms/db/schema';
import { eq, and, or, ilike, desc, gte, lte, type SQL } from 'drizzle-orm';
import type { AuditSearchParams } from './data';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Escapes a string for RFC 4180 CSV compliance.
 */
function escapeCsvCell(cell: unknown): string {
  if (cell === null || cell === undefined) return '';
  let str = typeof cell === 'object' ? JSON.stringify(cell) : String(cell);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports clinic audit logs to RFC 4180 CSV format.
 * Restricted to Owner role only.
 */
export async function exportAuditLogsCsvAction(
  params: AuditSearchParams
): Promise<ActionResult<{ csv: string; filename: string }>> {
  const { user } = await requireRole(['owner']);

  try {
    const csvContent = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const conditions: SQL[] = [eq(auditLog.clinicId, user.clinicId)];

        if (params.actorId && params.actorId !== 'all') {
          conditions.push(eq(auditLog.actorId, params.actorId));
        }

        if (params.action && params.action !== 'all') {
          conditions.push(ilike(auditLog.action, `%${params.action.trim()}%`));
        }

        if (params.entity && params.entity !== 'all') {
          conditions.push(eq(auditLog.entity, params.entity));
        }

        if (params.from) {
          const fromDate = new Date(params.from);
          if (!isNaN(fromDate.getTime())) {
            conditions.push(gte(auditLog.createdAt, fromDate));
          }
        }

        if (params.to) {
          const toDate = new Date(params.to);
          if (!isNaN(toDate.getTime())) {
            toDate.setHours(23, 59, 59, 999);
            conditions.push(lte(auditLog.createdAt, toDate));
          }
        }

        if (params.q?.trim()) {
          const query = `%${params.q.trim()}%`;
          conditions.push(
            or(
              ilike(auditLog.action, query),
              ilike(auditLog.entity, query),
              ilike(auditLog.entityId, query)
            )!
          );
        }

        const rows = await tx
          .select({
            id: auditLog.id,
            timestamp: auditLog.createdAt,
            actorId: auditLog.actorId,
            actorName: users.fullName,
            actorRole: users.role,
            action: auditLog.action,
            entity: auditLog.entity,
            entityId: auditLog.entityId,
            meta: auditLog.meta,
          })
          .from(auditLog)
          .leftJoin(users, eq(auditLog.actorId, users.id))
          .where(and(...conditions))
          .orderBy(desc(auditLog.createdAt))
          .limit(5000);

        const header = [
          'id',
          'timestamp',
          'actor_id',
          'actor_name',
          'actor_role',
          'action',
          'entity',
          'entity_id',
          'meta',
        ];

        const lines = [header.join(',')];

        for (const row of rows) {
          const line = [
            escapeCsvCell(row.id),
            escapeCsvCell(row.timestamp?.toISOString()),
            escapeCsvCell(row.actorId || ''),
            escapeCsvCell(row.actorName || 'System'),
            escapeCsvCell(row.actorRole || 'system'),
            escapeCsvCell(row.action),
            escapeCsvCell(row.entity),
            escapeCsvCell(row.entityId || ''),
            escapeCsvCell(row.meta),
          ];
          lines.push(line.join(','));
        }

        return lines.join('\r\n');
      }
    );

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `audit_log_${dateStr}.csv`;

    return {
      success: true,
      data: {
        csv: csvContent,
        filename,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to export audit logs',
    };
  }
}
