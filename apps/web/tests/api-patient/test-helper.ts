import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';

export const testDb = getDefaultDb();

export async function createTestClinic(prefix = 'Test Clinic') {
  const clinicId = randomUUID();
  const [clinic] = await testDb
    .insert(schema.clinics)
    .values({
      id: clinicId,
      name: `${prefix} ${Date.now()}`,
      slug: `clinic-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timezone: 'Asia/Karachi',
      locale: 'en-PK',
      phone: '+92-51-1112233',
      address: 'Test Address, Islamabad',
    })
    .returning();

  return clinic!;
}

export async function createTestPatient(
  clinicId: string,
  phone: string,
  fullName = 'Test Patient'
) {
  const patientId = randomUUID();
  const [patient] = await testDb
    .insert(schema.patients)
    .values({
      id: patientId,
      clinicId,
      fullName,
      phone,
      email: `${patientId}@example.test`,
      preferredLanguage: 'en',
    })
    .returning();

  return patient!;
}

export async function createTestDentist(
  clinicId: string,
  fullName = 'Dr. Test Dentist',
  role: 'dentist' | 'owner' = 'dentist'
) {
  const dentistId = randomUUID();
  const [dentist] = await testDb
    .insert(schema.users)
    .values({
      id: dentistId,
      clinicId,
      fullName,
      email: `dentist-${Date.now()}-${Math.random()}@example.test`,
      role,
    })
    .returning();

  return dentist!;
}

export async function cleanupClinic(clinicId: string) {
  try {
    await testDb.delete(schema.clinics).where(eq(schema.clinics.id, clinicId));
  } catch (err) {
    console.error('Failed to cleanup clinic:', clinicId, err);
  }
}
