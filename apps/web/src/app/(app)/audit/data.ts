import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { db } from '@/lib/db';
import { auditLog, users } from '@dental-pms/db/schema';
import { sql, eq, and, or, ilike, desc, gte, lte, type SQL } from 'drizzle-orm';

export interface AuditSearchParams {
  actorId?: string;
  action?: string;
  entity?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: string;
}

export interface AuditLogItem {
  id: string;
  clinicId: string;
  actorId: string | null;
  actorName: string;
  actorRole: string;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

export async function getAuditLogs(
  clinicId: string,
  params: AuditSearchParams
): Promise<{
  logs: AuditLogItem[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  staffUsers: Array<{ id: string; name: string; role: string }>;
}> {
  const pageSize = 50;
  const currentPage = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const offset = (currentPage - 1) * pageSize;

  return await withClinic(db, clinicId, async (tx: ClinicTransaction) => {
    // 1. Fetch clinic staff users for filter dropdown
    const staff = await tx
      .select({
        id: users.id,
        name: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(eq(users.clinicId, clinicId))
      .orderBy(users.fullName);

    // 2. Build where conditions
    const conditions: SQL[] = [eq(auditLog.clinicId, clinicId)];

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

    // 3. Count total matching rows
    const [countResult] = await tx
      .select({ count: sql<string>`count(*)` })
      .from(auditLog)
      .where(and(...conditions));

    const totalCount = parseInt(countResult?.count || '0', 10);

    // 4. Fetch page of logs
    const rows = await tx
      .select({
        id: auditLog.id,
        clinicId: auditLog.clinicId,
        actorId: auditLog.actorId,
        action: auditLog.action,
        entity: auditLog.entity,
        entityId: auditLog.entityId,
        meta: auditLog.meta,
        createdAt: auditLog.createdAt,
        actorName: users.fullName,
        actorRole: users.role,
        actorEmail: users.email,
      })
      .from(auditLog)
      .leftJoin(users, eq(auditLog.actorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(auditLog.createdAt))
      .limit(pageSize)
      .offset(offset);

    const logs: AuditLogItem[] = rows.map((r) => ({
      id: r.id,
      clinicId: r.clinicId,
      actorId: r.actorId,
      actorName: r.actorName || 'System',
      actorRole: r.actorRole || 'system',
      actorEmail: r.actorEmail,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      meta: (r.meta as Record<string, unknown>) || null,
      createdAt: r.createdAt,
    }));

    return {
      logs,
      totalCount,
      currentPage,
      pageSize,
      staffUsers: staff,
    };
  });
}
