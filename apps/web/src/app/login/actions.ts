'use server';

import { db } from '@/lib/db';
import { users } from '@dental-pms/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Checks if a staff or admin account is active in the database.
 */
export async function checkUserActiveStatus(userId: string): Promise<{ active: boolean; exists: boolean }> {
  try {
    const [profile] = await db
      .select({ active: users.active })
      .from(users)
      .where(eq(users.id, userId));

    if (!profile) {
      return { active: false, exists: false };
    }

    return { active: profile.active, exists: true };
  } catch {
    return { active: true, exists: true };
  }
}
