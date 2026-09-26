'use server';

import { requireUser } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic } from '@dental-pms/db';
import { clinics } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const updateClinicSchema = z.object({
  name: z.string().min(2, 'Clinic name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens only'),
  address: z.string().optional(),
  phone: z.string().optional(),
  currency: z.string().min(2, 'Currency code is required').default('PKR'),
  timezone: z.string().min(2, 'Timezone is required'),
  locale: z.string().min(2, 'Locale is required'),
});

export type UpdateClinicState = {
  success?: boolean;
  error?: string;
};

export async function updateClinicAction(
  _prevState: UpdateClinicState,
  formData: FormData
): Promise<UpdateClinicState> {
  const { user, clinicId } = await requireUser();

  if (user.role !== 'owner') {
    return { error: 'Forbidden: Only the clinic owner can update clinic settings.' };
  }

  const rawData = {
    name: formData.get('name'),
    slug: formData.get('slug'),
    address: formData.get('address'),
    phone: formData.get('phone'),
    currency: formData.get('currency') || 'PKR',
    timezone: formData.get('timezone'),
    locale: formData.get('locale'),
  };

  const parsed = updateClinicSchema.safeParse(rawData);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues.map((i) => i.message).join(', ');
    return { error: errorMsg };
  }

  try {
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .update(clinics)
        .set({
          name: parsed.data.name,
          slug: parsed.data.slug,
          address: parsed.data.address || null,
          phone: parsed.data.phone || null,
          currency: parsed.data.currency,
          timezone: parsed.data.timezone,
          locale: parsed.data.locale,
          updatedAt: new Date(),
        })
        .where(eq(clinics.id, clinicId));
    });

    revalidatePath('/settings/clinic');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'Failed to update clinic settings.' };
  }
}
