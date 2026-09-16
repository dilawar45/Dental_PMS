import 'dotenv/config';
import { createDb, withClinic } from './index';
import { clinics, patients } from './schema';
import { eq } from 'drizzle-orm';

async function runRlsTest() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const db = createDb(url);
  console.log('🧪 Starting Row-Level Security (RLS) Isolation Test...\n');

  try {
    // 1. Create two test clinics
    const [clinicA] = await db
      .insert(clinics)
      .values({
        name: 'RLS Test Clinic Alpha',
        slug: `rls-test-alpha-${Date.now()}`,
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
      })
      .returning();

    const [clinicB] = await db
      .insert(clinics)
      .values({
        name: 'RLS Test Clinic Beta',
        slug: `rls-test-beta-${Date.now()}`,
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
      })
      .returning();

    if (!clinicA || !clinicB) {
      throw new Error('Failed to create test clinics');
    }

    console.log(`  [1] Created Test Clinic A: ${clinicA.name} (${clinicA.id})`);
    console.log(`  [2] Created Test Clinic B: ${clinicB.name} (${clinicB.id})`);

    // 2. Insert patient in Clinic A using withClinic(A)
    const patientA = await withClinic(db, clinicA.id, async (tx) => {
      const [p] = await tx
        .insert(patients)
        .values({
          clinicId: clinicA.id,
          fullName: 'Patient Alpha One',
          phone: '+923001111111',
          email: 'alpha@example.com',
        })
        .returning();
      return p!;
    });
    console.log(`  [3] Inserted Patient Alpha under withClinic(A): ${patientA.fullName}`);

    // 3. Insert patient in Clinic B using withClinic(B)
    const patientB = await withClinic(db, clinicB.id, async (tx) => {
      const [p] = await tx
        .insert(patients)
        .values({
          clinicId: clinicB.id,
          fullName: 'Patient Beta One',
          phone: '+923002222222',
          email: 'beta@example.com',
        })
        .returning();
      return p!;
    });
    console.log(`  [4] Inserted Patient Beta under withClinic(B): ${patientB.fullName}`);

    // 4. Verify Clinic A cannot see Clinic B rows
    const seenByClinicA = await withClinic(db, clinicA.id, async (tx) => {
      return await tx.select().from(patients);
    });
    console.log(`  [5] Query under withClinic(A) returned ${seenByClinicA.length} patient(s)`);

    const hasPatientBInA = seenByClinicA.some((p) => p.id === patientB.id);
    if (hasPatientBInA) {
      throw new Error('❌ RLS FAILURE: withClinic(A) was able to view patient from Clinic B!');
    }

    // 5. Verify Clinic B cannot see Clinic A rows
    const seenByClinicB = await withClinic(db, clinicB.id, async (tx) => {
      return await tx.select().from(patients);
    });
    console.log(`  [6] Query under withClinic(B) returned ${seenByClinicB.length} patient(s)`);

    const hasPatientAInB = seenByClinicB.some((p) => p.id === patientA.id);
    if (hasPatientAInB) {
      throw new Error('❌ RLS FAILURE: withClinic(B) was able to view patient from Clinic A!');
    }

    // 6. Direct query for Patient B from withClinic(A)
    const directQueryCrossClinic = await withClinic(db, clinicA.id, async (tx) => {
      return await tx.select().from(patients).where(eq(patients.id, patientB.id));
    });

    if (directQueryCrossClinic.length > 0) {
      throw new Error('❌ RLS FAILURE: withClinic(A) fetched Patient B via direct ID lookup!');
    }

    console.log('\n✅ PROOF VERIFIED: withClinic(A) CANNOT see rows from Clinic B.');
    console.log('✅ PROOF VERIFIED: withClinic(B) CANNOT see rows from Clinic A.');

    // Cleanup test data
    await db.delete(clinics).where(eq(clinics.id, clinicA.id));
    await db.delete(clinics).where(eq(clinics.id, clinicB.id));
    console.log('🧹 Cleaned up temporary test clinics and cascade-deleted patient rows.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ RLS Test Failed:', error);
    process.exit(1);
  }
}

runRlsTest();
