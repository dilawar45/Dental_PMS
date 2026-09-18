import 'dotenv/config';
import { createDb, withClinic, withPlatformAdmin } from './index';
import { clinics, users, patients } from './schema';
import { eq } from 'drizzle-orm';

async function runPhase6RlsTests() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const db = createDb(url);
  console.log('🧪 Starting Phase 6 RLS & Support Mode Verification Tests...\n');

  try {
    // 1. Fetch super-admin
    const [superAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (!superAdmin) {
      throw new Error('No super_admin user found. Run seed:super-admin first.');
    }
    console.log(`  [1] Super-admin found: ${superAdmin.email} (${superAdmin.id})`);

    // 2. Create 2 test clinics
    const suffix = Date.now();
    const [clinicA] = await db
      .insert(clinics)
      .values({
        name: `Phase 6 Test Clinic Alpha ${suffix}`,
        slug: `phase6-alpha-${suffix}`,
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
        status: 'active',
      })
      .returning();

    const [clinicB] = await db
      .insert(clinics)
      .values({
        name: `Phase 6 Test Clinic Beta ${suffix}`,
        slug: `phase6-beta-${suffix}`,
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
        status: 'active',
      })
      .returning();

    console.log(`  [2] Created Clinic Alpha (${clinicA!.id}) and Clinic Beta (${clinicB!.id})`);

    // 3. Create owner for Clinic A
    const [ownerA] = await db
      .insert(users)
      .values({
        clinicId: clinicA!.id,
        email: `owner-alpha-${suffix}@example.com`,
        fullName: 'Dr. Owner Alpha',
        role: 'owner',
        isSuperAdmin: false,
        active: true,
      })
      .returning();

    // 4. Create patients under both clinics
    const patientA = await withClinic(
      db,
      clinicA!.id,
      async (tx) => {
        const [p] = await tx
          .insert(patients)
          .values({
            clinicId: clinicA!.id,
            fullName: 'Patient Alpha In Alpha',
            phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
          })
          .returning();
        return p!;
      },
      { actorId: ownerA!.id }
    );

    const patientB = await withClinic(
      db,
      clinicB!.id,
      async (tx) => {
        const [p] = await tx
          .insert(patients)
          .values({
            clinicId: clinicB!.id,
            fullName: 'Patient Beta In Beta',
            phone: `+92300${Math.floor(1000000 + Math.random() * 9000000)}`,
          })
          .returning();
        return p!;
      }
    );

    console.log(`  [3] Inserted Patient Alpha (${patientA.id}) and Patient Beta (${patientB.id})`);

    // TEST A: Regular owner in Clinic A can see ONLY their clinic and patients
    console.log('\n  --- Test A: Regular Owner Isolation ---');
    const ownerAVisibleClinics = await withClinic(
      db,
      clinicA!.id,
      async (tx) => {
        return await tx.select().from(clinics);
      },
      { actorId: ownerA!.id }
    );
    console.log(`  Owner Alpha sees ${ownerAVisibleClinics.length} clinic(s)`);
    if (ownerAVisibleClinics.length !== 1 || ownerAVisibleClinics[0]?.id !== clinicA!.id) {
      throw new Error(`❌ RLS FAILURE: Owner Alpha saw unexpected clinics! Expected 1, got ${ownerAVisibleClinics.length}`);
    }
    console.log('  ✅ Verified: Regular owner can see ONLY their clinic.');

    const ownerAVisiblePatients = await withClinic(
      db,
      clinicA!.id,
      async (tx) => {
        return await tx.select().from(patients);
      },
      { actorId: ownerA!.id }
    );
    const hasPatientB = ownerAVisiblePatients.some((p) => p.id === patientB.id);
    if (hasPatientB) {
      throw new Error('❌ RLS FAILURE: Owner Alpha saw Patient Beta from Clinic B!');
    }
    console.log(`  ✅ Verified: Regular owner sees only their clinic patients (Patient Beta invisible).`);

    // TEST B: Super-admin via withPlatformAdmin sees all clinics
    console.log('\n  --- Test B: Super-Admin Global Visibility ---');
    const allClinicsSeen = await withPlatformAdmin(
      db,
      async (tx) => {
        return await tx.select().from(clinics);
      },
      { actorId: superAdmin.id }
    );
    console.log(`  Super-admin sees ${allClinicsSeen.length} clinics globally.`);
    const seesBoth =
      allClinicsSeen.some((c) => c.id === clinicA!.id) &&
      allClinicsSeen.some((c) => c.id === clinicB!.id);
    if (!seesBoth) {
      throw new Error('❌ RLS FAILURE: Super-admin could not see both test clinics!');
    }
    console.log('  ✅ Verified: Super-admin can see all clinics via withPlatformAdmin.');

    // TEST C: Super-admin in support mode sees ONLY target clinic clinical data
    console.log('\n  --- Test C: Super-Admin in Support Mode ---');
    const supportModePatients = await withClinic(
      db,
      clinicA!.id,
      async (tx) => {
        return await tx.select().from(patients);
      },
      {
        supportMode: true,
        realActorId: superAdmin.id,
        impersonatedUserId: ownerA!.id,
      }
    );

    const supportHasPatientA = supportModePatients.some((p) => p.id === patientA.id);
    const supportHasPatientB = supportModePatients.some((p) => p.id === patientB.id);

    if (!supportHasPatientA) {
      throw new Error('❌ SUPPORT MODE FAILURE: Super-admin could not see target clinic patient!');
    }
    if (supportHasPatientB) {
      throw new Error('❌ SUPPORT MODE FAILURE: Super-admin saw Patient Beta from Clinic B!');
    }
    console.log('  ✅ Verified: Super-admin in support mode sees ONLY target clinic clinical data (Patient B strictly invisible).');

    // Cleanup test records
    await db.delete(patients).where(eq(patients.id, patientA.id));
    await db.delete(patients).where(eq(patients.id, patientB.id));
    await db.delete(users).where(eq(users.id, ownerA!.id));
    await db.delete(clinics).where(eq(clinics.id, clinicA!.id));
    await db.delete(clinics).where(eq(clinics.id, clinicB!.id));

    console.log('\n🎉 ALL PHASE 6 RLS TESTS PASSED!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
}

runPhase6RlsTests();
