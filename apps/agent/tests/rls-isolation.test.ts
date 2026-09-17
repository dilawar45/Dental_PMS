import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import { createPatient, lookupPatient } from '../src/agent/tools';
import { runInClinic } from '../src/db/context';

describe('Multi-Tenant Row-Level Security (RLS) Isolation', () => {
  const db = getDefaultDb();
  const clinicAId = randomUUID();
  const clinicBId = randomUUID();
  const patientPhone = `+92311${Math.floor(1000000 + Math.random() * 9000000)}`;
  let patientAId: string;

  beforeAll(async () => {
    // 1. Create Clinic A
    await db.insert(schema.clinics).values({
      id: clinicAId,
      name: 'Clinic Alpha Dental',
      slug: `clinic-alpha-${Date.now()}`,
      timezone: 'Asia/Karachi',
      locale: 'en-PK',
    });

    // 2. Create Clinic B
    await db.insert(schema.clinics).values({
      id: clinicBId,
      name: 'Clinic Beta Dental',
      slug: `clinic-beta-${Date.now()}`,
      timezone: 'Asia/Karachi',
      locale: 'en-PK',
    });
  });

  afterAll(async () => {
    // Cleanup both clinics (cascades)
    try {
      await db.delete(schema.clinics).where(eq(schema.clinics.id, clinicAId));
      await db.delete(schema.clinics).where(eq(schema.clinics.id, clinicBId));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('creates patient under Clinic A and proves it is completely invisible from Clinic B', async () => {
    // 1. Create patient under Clinic A context
    const creationResult = await createPatient.execute(
      {
        full_name: 'Alpha Patient',
        phone: patientPhone,
        consent_type: 'data_processing',
      },
      { clinic_id: clinicAId }
    );

    expect(creationResult.patient_id).toBeDefined();
    patientAId = creationResult.patient_id;

    // 2. Lookup patient from Clinic B context via tool
    const lookupFromB = await lookupPatient.execute(
      { phone: patientPhone },
      { clinic_id: clinicBId }
    );

    // MUST be invisible to Clinic B
    expect(lookupFromB.found).toBe(false);
    expect(lookupFromB.patient).toBeNull();

    // 3. Direct RLS query proof: try to query patient row directly using Clinic B's transaction
    const directQueryFromB = await runInClinic(clinicBId, async (tx) => {
      return await tx
        .select()
        .from(schema.patients)
        .where(eq(schema.patients.id, patientAId));
    });

    // PostgreSQL RLS policy filters the row completely: 0 rows returned
    expect(directQueryFromB).toHaveLength(0);

    // 4. Verify patient is visible from Clinic A's context
    const lookupFromA = await lookupPatient.execute(
      { phone: patientPhone },
      { clinic_id: clinicAId }
    );
    expect(lookupFromA.found).toBe(true);
    expect(lookupFromA.patient?.id).toBe(patientAId);
    expect(lookupFromA.patient?.full_name).toBe('Alpha Patient');
  });
});
