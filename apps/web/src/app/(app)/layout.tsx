import { requireUser, getClinicDbOptions } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { clinics } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/layout/app-shell';
import { SupportModeBanner } from '@/components/layout/support-mode-banner';
import { ForcePasswordChangeModal } from '@/components/layout/force-password-change-modal';
import { redirect } from 'next/navigation';

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireUser();
  const { user, clinicId, isSupportMode, realUser, supportSessionExpiresAt } = context;

  // Query clinic with RLS enforced via withClinic passing support mode session options
  const clinic = await withClinic(
    db,
    clinicId,
    async (tx) => {
      const [c] = await tx.select().from(clinics).where(eq(clinics.id, clinicId));
      return c;
    },
    getClinicDbOptions(context)
  );

  if (!clinic) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {isSupportMode && realUser && supportSessionExpiresAt && (
        <SupportModeBanner
          clinicName={clinic.name}
          superAdminEmail={realUser.email}
          impersonatedName={user.fullName || user.email}
          expiresAt={supportSessionExpiresAt}
        />
      )}

      {/* Forced first-time login password change prompt for staff privacy */}
      <ForcePasswordChangeModal
        mustChange={Boolean(user.mustChangePassword)}
        userName={user.fullName || 'Staff Member'}
        userEmail={user.email}
      />

      <div className="flex-1 flex flex-col">
        <AppShell user={user} clinic={clinic}>
          {children}
        </AppShell>
      </div>
    </div>
  );
}
