import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { platformAuditLog, users, clinics } from '@dental-pms/db/schema';
import { desc, eq } from 'drizzle-orm';
import { PlatformAuditClient } from './audit-client';

export const dynamic = 'force-dynamic';

export default async function PlatformAuditPage() {
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;

  const data = await withPlatformAdmin(
    db,
    async (tx) => {
      const logs = await tx
        .select({
          id: platformAuditLog.id,
          actorId: platformAuditLog.actorId,
          action: platformAuditLog.action,
          targetClinicId: platformAuditLog.targetClinicId,
          meta: platformAuditLog.meta,
          at: platformAuditLog.at,
          actorEmail: users.email,
          targetClinicName: clinics.name,
        })
        .from(platformAuditLog)
        .leftJoin(users, eq(platformAuditLog.actorId, users.id))
        .leftJoin(clinics, eq(platformAuditLog.targetClinicId, clinics.id))
        .orderBy(desc(platformAuditLog.at))
        .limit(100);

      return logs.map((log) => ({
        ...log,
        meta: (log.meta || {}) as Record<string, unknown>,
      }));
    },
    { actorId }
  );

  return <PlatformAuditClient logs={data} />;
}
