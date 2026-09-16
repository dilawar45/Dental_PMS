import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { users } from '@dental-pms/db/schema';
import { eq, asc } from 'drizzle-orm';
import { ForbiddenPage } from '@/components/forbidden';
import { UserList } from './user-list';

export default async function UserManagementPage() {
  const { user, clinicId } = await requireUser();

  // Enforce server-side role check: Owner only
  if (user.role !== 'owner') {
    return <ForbiddenPage role={user.role} requiredRole="owner" />;
  }

  // Fetch all staff users for this clinic with RLS enforced via withClinic
  const staffUsers = await withClinic(db, clinicId, async (tx) => {
    return await tx
      .select()
      .from(users)
      .where(eq(users.clinicId, clinicId))
      .orderBy(asc(users.createdAt));
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Staff & User Management
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View staff accounts, assign clinical roles, and manage system access permissions.
        </p>
      </div>

      <UserList currentUserId={user.id} users={staffUsers} />
    </div>
  );
}
