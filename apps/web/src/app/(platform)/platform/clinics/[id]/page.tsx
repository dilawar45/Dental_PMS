import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { clinics, users, clinicInvites, platformAuditLog } from '@dental-pms/db/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ClinicDetailClient } from './clinic-detail-client';

export const dynamic = 'force-dynamic';

export default async function ClinicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;

  const headerList = await headers();
  const host = headerList.get('host') || 'localhost:3000';
  const proto = headerList.get('x-forwarded-proto') || 'http';
  const origin = `${proto}://${host}`;

  const data = await withPlatformAdmin(
    db,
    async (tx) => {
      // 1. Fetch clinic
      const [clinic] = await tx.select().from(clinics).where(eq(clinics.id, id));
      if (!clinic) return null;

      // 2. Fetch staff users
      const staffUsers = await tx
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          active: users.active,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.clinicId, id))
        .orderBy(desc(users.createdAt));

      // 3. Fetch invites
      const invites = await tx
        .select({
          id: clinicInvites.id,
          email: clinicInvites.email,
          role: clinicInvites.role,
          token: clinicInvites.token,
          expiresAt: clinicInvites.expiresAt,
          acceptedAt: clinicInvites.acceptedAt,
          createdAt: clinicInvites.createdAt,
        })
        .from(clinicInvites)
        .where(eq(clinicInvites.clinicId, id))
        .orderBy(desc(clinicInvites.createdAt));

      // 4. Fetch activity
      const activity = await tx
        .select({
          id: platformAuditLog.id,
          action: platformAuditLog.action,
          meta: platformAuditLog.meta,
          at: platformAuditLog.at,
        })
        .from(platformAuditLog)
        .where(eq(platformAuditLog.targetClinicId, id))
        .orderBy(desc(platformAuditLog.at))
        .limit(20);

      return {
        clinic,
        users: staffUsers,
        invites,
        activity: activity.map((a) => ({
          ...a,
          meta: (a.meta || {}) as Record<string, unknown>,
        })),
      };
    },
    { actorId }
  );

  if (!data) {
    notFound();
  }

  return (
    <ClinicDetailClient
      clinic={data.clinic}
      users={data.users}
      invites={data.invites}
      activity={data.activity}
      origin={origin}
    />
  );
}
