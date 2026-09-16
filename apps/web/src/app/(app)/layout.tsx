import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { clinics } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';
import { AppShell } from '@/components/layout/app-shell';

import { redirect } from 'next/navigation';

export default async function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, clinicId } = await requireUser();

  // Query clinic with RLS enforced via withClinic
  const clinic = await withClinic(db, clinicId, async (tx) => {
    const [c] = await tx.select().from(clinics).where(eq(clinics.id, clinicId));
    return c;
  });

  if (!clinic) {
    redirect('/login');
  }

  return (
    <AppShell user={user} clinic={clinic}>
      {children}
    </AppShell>
  );
}
