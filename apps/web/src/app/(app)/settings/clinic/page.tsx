import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { clinics } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';
import { ForbiddenPage } from '@/components/forbidden';
import { ClinicForm } from './clinic-form';

export default async function ClinicSettingsPage() {
  const { user, clinicId } = await requireUser();

  // Enforce server-side role check: Owner only
  if (user.role !== 'owner') {
    return <ForbiddenPage role={user.role} requiredRole="owner" />;
  }

  // Query clinic with RLS enforced via withClinic
  const clinic = await withClinic(db, clinicId, async (tx) => {
    const [c] = await tx.select().from(clinics).where(eq(clinics.id, clinicId));
    return c;
  });

  if (!clinic) {
    throw new Error(`Data integrity violation: Clinic ${clinicId} not found.`);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
          Clinic Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Manage practice location, branding, communication identifiers, and locale.
        </p>
      </div>

      <ClinicForm clinic={clinic} />
    </div>
  );
}
