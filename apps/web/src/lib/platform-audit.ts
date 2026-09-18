import { db } from '@/lib/db';
import { platformAuditLog } from '@dental-pms/db/schema';
import { headers } from 'next/headers';

export type PlatformAuditAction =
  | 'clinic.created'
  | 'clinic.updated'
  | 'clinic.suspended'
  | 'clinic.reactivated'
  | 'clinic.archived'
  | 'invite.created'
  | 'invite.revoked'
  | 'invite.accepted'
  | 'support.entered'
  | 'support.exited'
  | 'user.password_reset'
  | 'user.force_logout'
  | 'user.role_change';

export interface LogPlatformAuditParams {
  actorId?: string | null;
  action: PlatformAuditAction;
  targetClinicId?: string | null;
  entityId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Logs a platform-level event into platform_audit_log.
 */
export async function logPlatformAudit(params: LogPlatformAuditParams): Promise<void> {
  let ip: string | null = null;
  let userAgent: string | null = null;

  try {
    const headerList = await headers();
    ip =
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      headerList.get('x-real-ip') ||
      null;
    userAgent = headerList.get('user-agent') || null;
  } catch {
    // Background tasks or tests might not have request headers
  }

  let entity = 'platform';
  if (params.action.startsWith('clinic.')) entity = 'clinic';
  else if (params.action.startsWith('invite.')) entity = 'invite';
  else if (params.action.startsWith('support.')) entity = 'support';
  else if (params.action.startsWith('user.')) entity = 'user';

  const meta: Record<string, unknown> = {
    ...(params.meta ?? {}),
    ...(ip ? { ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };

  await db.insert(platformAuditLog).values({
    actorId: params.actorId ?? null,
    action: params.action,
    entity,
    entityId: params.entityId ?? params.targetClinicId ?? null,
    targetClinicId: params.targetClinicId ?? null,
    meta,
  });
}
