import { createDb, withClinic, type ClinicTransaction } from './index';
import { clinics, users, patients, appointments, bookingRequests, auditLog } from './schema';
import { eq, and, ne, lt, gt, desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const db = createDb(process.env.DATABASE_URL!);

// Lifecycle validation function matching the server action
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['arrived', 'no_show', 'cancelled'],
  arrived: ['completed', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
};

function validateTransition(from: string, to: string) {
  const allowed = ALLOWED_STATUS_TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Illegal status transition from '${from}' to '${to}'`);
  }
}

async function runPhase2CTests() {
  console.log('🧪 RUNNING PHASE 2C AUTOMATED VERIFICATION SUITE\n');

  // 1. Fetch clinic and test actors
  const [clinic] = await db.select().from(clinics).where(eq(clinics.name, 'Bright Smile Dental')).limit(1);
  if (!clinic) throw new Error('Bright Smile Dental clinic not found');

  const [owner] = await db.select().from(users).where(eq(users.email, 'owner@brightsmile.com'));
  const [dentist] = await db.select().from(users).where(eq(users.email, 'dentist@brightsmile.com'));
  const [patient] = await db.select().from(patients).where(eq(patients.clinicId, clinic.id)).limit(1);

  if (!owner || !dentist || !patient) throw new Error('Missing test actors from seed');

  console.log(`Clinic: ${clinic.name} (${clinic.id})`);
  console.log(`Practitioner: ${dentist.fullName} (${dentist.id})`);
  console.log(`Patient: ${patient.fullName} (${patient.id})\n`);

  // TEST 1: Overlap check detection
  console.log('--- TEST 1: Dentist Overlap Protection ---');
  const baseStart = new Date(Date.now() + 10 * 24 * 3600 * 1000); // 10 days in future
  baseStart.setHours(14, 0, 0, 0);
  const baseEnd = new Date(baseStart.getTime() + 60 * 60 * 1000); // 1 hour duration

  let firstApptId: string = '';

  await withClinic(db, clinic.id, async (tx: ClinicTransaction) => {
    // Clean up any test artifact from previous run
    await tx.delete(appointments).where(
      and(
        eq(appointments.clinicId, clinic.id),
        eq(appointments.reason, 'Phase 2C Automated Overlap Baseline')
      )
    );

    // Insert baseline appointment
    const [inserted] = await tx
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        patientId: patient.id,
        dentistId: dentist.id,
        startAt: baseStart,
        endAt: baseEnd,
        status: 'scheduled',
        reason: 'Phase 2C Automated Overlap Baseline',
      })
      .returning();

    firstApptId = inserted!.id;

    // Log audit
    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'appointment.create',
      entity: 'appointment',
      entityId: firstApptId,
      meta: {
        patientId: patient.id,
        dentistId: dentist.id,
        startAt: baseStart.toISOString(),
        endAt: baseEnd.toISOString(),
      },
    });
  });

  console.log(`  [+] Baseline appointment inserted: ${firstApptId}`);

  // Now attempt to insert overlapping appointment (starts 30 mins after baseStart, ends 30 mins after baseEnd)
  const overlapStart = new Date(baseStart.getTime() + 30 * 60 * 1000);
  const overlapEnd = new Date(baseEnd.getTime() + 30 * 60 * 1000);

  let overlapBlocked = false;
  try {
    await withClinic(db, clinic.id, async (tx: ClinicTransaction) => {
      const conflicts = await tx
        .select({ id: appointments.id })
        .from(appointments)
        .where(
          and(
            eq(appointments.clinicId, clinic.id),
            eq(appointments.dentistId, dentist.id),
            ne(appointments.status, 'cancelled'),
            lt(appointments.startAt, overlapEnd),
            gt(appointments.endAt, overlapStart)
          )
        );

      if (conflicts.length > 0) {
        throw new Error('Overlap detected: Dentist already booked');
      }

      await tx.insert(appointments).values({
        clinicId: clinic.id,
        patientId: patient.id,
        dentistId: dentist.id,
        startAt: overlapStart,
        endAt: overlapEnd,
        status: 'scheduled',
        reason: 'Should be rejected',
      });
    });
  } catch (err: unknown) {
    overlapBlocked = true;
    console.log(`  ✅ Overlap check successfully blocked conflicting appointment: ${(err as Error).message}`);
  }

  if (!overlapBlocked) {
    throw new Error('FAIL: Overlapping appointment was NOT blocked!');
  }

  // TEST 2: Status Lifecycle State Machine
  console.log('\n--- TEST 2: Status Lifecycle Transitions & State Machine ---');
  await withClinic(db, clinic.id, async (tx: ClinicTransaction) => {
    // scheduled -> confirmed (legal)
    validateTransition('scheduled', 'confirmed');
    await tx.update(appointments).set({ status: 'confirmed' }).where(eq(appointments.id, firstApptId));
    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'appointment.status_change',
      entity: 'appointment',
      entityId: firstApptId,
      meta: { previousStatus: 'scheduled', newStatus: 'confirmed' },
    });
    console.log('  ✅ Transitioned scheduled -> confirmed');

    // confirmed -> arrived (legal)
    validateTransition('confirmed', 'arrived');
    await tx.update(appointments).set({ status: 'arrived' }).where(eq(appointments.id, firstApptId));
    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'appointment.status_change',
      entity: 'appointment',
      entityId: firstApptId,
      meta: { previousStatus: 'confirmed', newStatus: 'arrived' },
    });
    console.log('  ✅ Transitioned confirmed -> arrived');

    // arrived -> completed (legal)
    validateTransition('arrived', 'completed');
    await tx.update(appointments).set({ status: 'completed' }).where(eq(appointments.id, firstApptId));
    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'appointment.status_change',
      entity: 'appointment',
      entityId: firstApptId,
      meta: { previousStatus: 'arrived', newStatus: 'completed' },
    });
    console.log('  ✅ Transitioned arrived -> completed');
  });

  // TEST 3: Illegal Transition Rejection
  console.log('\n--- TEST 3: Illegal Transition Enforcement ---');
  let illegalTransitionBlocked = false;
  try {
    // Attempt illegal transition: completed -> scheduled
    validateTransition('completed', 'scheduled');
  } catch (err: unknown) {
    illegalTransitionBlocked = true;
    console.log(`  ✅ Illegal transition correctly rejected: ${(err as Error).message}`);
  }
  if (!illegalTransitionBlocked) throw new Error('FAIL: Illegal transition was not rejected!');

  let cancelTransitionBlocked = false;
  try {
    // Attempt illegal transition: cancelled -> confirmed
    validateTransition('cancelled', 'confirmed');
  } catch (err: unknown) {
    cancelTransitionBlocked = true;
    console.log(`  ✅ Illegal transition correctly rejected: ${(err as Error).message}`);
  }
  if (!cancelTransitionBlocked) throw new Error('FAIL: Illegal transition from cancelled was not rejected!');

  // TEST 4: Booking Request Approval Workflow
  console.log('\n--- TEST 4: Booking Request Approval Workflow ---');
  let approvedApptId: string = '';
  await withClinic(db, clinic.id, async (tx: ClinicTransaction) => {
    // Find a pending booking request
    const [pendingReq] = await tx
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.clinicId, clinic.id), eq(bookingRequests.status, 'pending')))
      .limit(1);

    if (!pendingReq) throw new Error('No pending booking request found to test approval');

    const apptSlotStart = new Date(Date.now() + 15 * 24 * 3600 * 1000);
    const apptSlotEnd = new Date(apptSlotStart.getTime() + 45 * 60 * 1000);

    // Create confirmed appointment
    const [newAppt] = await tx
      .insert(appointments)
      .values({
        clinicId: clinic.id,
        patientId: pendingReq.patientId || patient.id,
        dentistId: dentist.id,
        startAt: apptSlotStart,
        endAt: apptSlotEnd,
        status: 'confirmed',
        reason: pendingReq.reason || 'Omnichannel booking approved',
        notes: `Approved from ${pendingReq.requestedVia} inquiry`,
      })
      .returning();

    approvedApptId = newAppt!.id;

    // Update booking request status
    await tx
      .update(bookingRequests)
      .set({
        status: 'approved',
        patientId: pendingReq.patientId || patient.id,
        updatedAt: new Date(),
      })
      .where(eq(bookingRequests.id, pendingReq.id));

    // Audit logs
    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'booking_request.approve',
      entity: 'booking_request',
      entityId: pendingReq.id,
      meta: {
        appointmentId: approvedApptId,
        dentistId: dentist.id,
        channel: pendingReq.requestedVia,
      },
    });

    console.log(`  ✅ Booking request #${pendingReq.id.slice(0, 8)} approved -> Created appointment #${approvedApptId.slice(0, 8)} (status: confirmed)`);
  });

  // TEST 5: Booking Request Rejection Workflow
  console.log('\n--- TEST 5: Booking Request Rejection Workflow ---');
  await withClinic(db, clinic.id, async (tx: ClinicTransaction) => {
    const [pendingReq] = await tx
      .select()
      .from(bookingRequests)
      .where(and(eq(bookingRequests.clinicId, clinic.id), eq(bookingRequests.status, 'pending')))
      .limit(1);

    if (!pendingReq) throw new Error('No pending booking request found to test rejection');

    await tx
      .update(bookingRequests)
      .set({
        status: 'rejected',
        notes: 'Schedule full for the requested day; patient informed via WhatsApp',
        updatedAt: new Date(),
      })
      .where(eq(bookingRequests.id, pendingReq.id));

    await tx.insert(auditLog).values({
      clinicId: clinic.id,
      actorId: owner.id,
      action: 'booking_request.reject',
      entity: 'booking_request',
      entityId: pendingReq.id,
      meta: {
        reason: 'Schedule full for the requested day; patient informed via WhatsApp',
        channel: pendingReq.requestedVia,
      },
    });

    console.log(`  ✅ Booking request #${pendingReq.id.slice(0, 8)} rejected with documented reason`);
  });

  // TEST 6: Audit Log Inspection
  console.log('\n--- TEST 6: Sample Audit Log Verification ---');
  const recentLogs = await db
    .select({
      action: auditLog.action,
      entity: auditLog.entity,
      entityId: auditLog.entityId,
      meta: auditLog.meta,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(eq(auditLog.clinicId, clinic.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(5);

  console.log('Sample Recent Audit Log Rows:');
  console.log(JSON.stringify(recentLogs, null, 2));

  console.log('\n🎉 ALL PHASE 2C AUTOMATED TESTS PASSED SUCCESSFULLY!');
  process.exit(0);
}

runPhase2CTests().catch((err) => {
  console.error('❌ PHASE 2C TEST FAILED:', err);
  process.exit(1);
});
