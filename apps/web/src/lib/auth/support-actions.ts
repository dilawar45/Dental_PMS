'use server';

import { clearSupportModeCookie, getSupportModeFromCookies } from './support-mode';
import { logPlatformAudit } from '@/lib/platform-audit';
import { redirect } from 'next/navigation';

export async function exitSupportModeAction(): Promise<void> {
  const supportCheck = await getSupportModeFromCookies();
  let clinicId = '';

  if (supportCheck && supportCheck.valid) {
    clinicId = supportCheck.payload.targetClinicId;
    await logPlatformAudit({
      actorId: supportCheck.payload.superAdminId,
      action: 'support.exited',
      targetClinicId: clinicId,
      meta: {
        reason: 'Manual exit by super-admin',
        impersonatedUserId: supportCheck.payload.ownerId,
      },
    });
  }

  await clearSupportModeCookie();
  redirect(clinicId ? `/platform/clinics/${clinicId}` : '/platform/clinics');
}
