import { getCurrentUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withPlatformAdmin } from '@dental-pms/db';
import { users, clinics } from '@dental-pms/db/schema';
import { desc, eq } from 'drizzle-orm';
import { PlatformUsersClient } from './users-client';

export const dynamic = 'force-dynamic';

export default async function PlatformUsersPage() {
  const context = await getCurrentUser();
  const actorId = context?.realUser?.id || context?.user.id;

  const data = await withPlatformAdmin(
    db,
    async (tx) => {
      const userRows = await tx
        .select({
          id: users.id,
          email: users.email,
          fullName: users.fullName,
          role: users.role,
          active: users.active,
          clinicId: users.clinicId,
          createdAt: users.createdAt,
          clinicName: clinics.name,
        })
        .from(users)
        .leftJoin(clinics, eq(users.clinicId, clinics.id))
        .orderBy(desc(users.createdAt));

      return userRows;
    },
    { actorId }
  );

  return <PlatformUsersClient users={data} />;
}
