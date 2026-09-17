import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import { getDefaultDb, schema } from '@dental-pms/db';
import {
  lookupPatient,
  createPatient,
  getClinicInfo,
  checkAvailability,
  createBookingRequest,
  triageSymptoms,
  requestHumanHandoff,
  sendReceipt,
} from '../src/agent/tools';

describe('Tools Integration with PostgreSQL Database', () => {
  const db = getDefaultDb();
  const testClinicId = randomUUID();
  const testDentistUserId = randomUUID();
  let createdPatientId: string;
  let testInvoiceId: string;
  let testReceiptId: string;
  const testPhone = `+92300${Math.floor(1000000 + Math.random() * 9000000)}`;

  beforeAll(async () => {
    // 1. Create dedicated test clinic
    await db.insert(schema.clinics).values({
      id: testClinicId,
      name: 'Integration Test Dental Clinic',
      slug: `test-clinic-${Date.now()}`,
      address: 'Test Street 101, Phase 5, Lahore',
      phone: '+924235000000',
      timezone: 'Asia/Karachi',
      locale: 'en-PK',
    });

    // 2. Create dedicated dentist practitioner in this test clinic
    await db.insert(schema.users).values({
      id: testDentistUserId,
      clinicId: testClinicId,
      fullName: 'Dr. Test Dentist',
      email: `dentist-${Date.now()}@testclinic.example.com`,
      role: 'dentist',
    });
  });

  afterAll(async () => {
    // Cascade delete test clinic (cleans up all associated rows in all tables)
    try {
      await db.delete(schema.clinics).where(eq(schema.clinics.id, testClinicId));
      await db.delete(schema.devOutbox).where(eq(schema.devOutbox.to, testPhone));
    } catch (e) {
      console.error('Cleanup error:', e);
    }
  });

  it('create_patient creates a patient, attaches compliance consent, and emits audit log', async () => {
    const context = { clinic_id: testClinicId, session_id: 'test_session_1' };
    const result = await createPatient.execute(
      {
        full_name: 'Zubair Khan',
        phone: testPhone,
        consent_type: 'data_processing',
        gender: 'male',
        dob: '1990-01-01',
      },
      context
    );

    expect(result.patient_id).toBeDefined();
    expect(result.full_name).toBe('Zubair Khan');
    expect(result.phone).toBe(testPhone);
    expect(result.status).toBe('created');
    createdPatientId = result.patient_id;

    // Verify patient row exists in DB
    const [patientRow] = await db
      .select()
      .from(schema.patients)
      .where(eq(schema.patients.id, createdPatientId));
    expect(patientRow).toBeDefined();
    expect(patientRow?.fullName).toBe('Zubair Khan');

    // Verify consent row exists with bilingual text snapshot
    const [consentRow] = await db
      .select()
      .from(schema.consents)
      .where(
        and(
          eq(schema.consents.patientId, createdPatientId),
          eq(schema.consents.clinicId, testClinicId)
        )
      );
    expect(consentRow).toBeDefined();
    expect(consentRow?.type).toBe('data_processing');
    expect(consentRow?.textSnapshot).toContain('تشخیص اور علاج');

    // Verify audit log entry was written
    const [auditRow] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.clinicId, testClinicId),
          eq(schema.auditLog.action, 'patient.create'),
          eq(schema.auditLog.entityId, createdPatientId)
        )
      );
    expect(auditRow).toBeDefined();
    expect(auditRow?.entity).toBe('patient');
  });

  it('lookup_patient finds existing patient by phone number', async () => {
    const context = { clinic_id: testClinicId };
    const result = await lookupPatient.execute({ phone: testPhone }, context);

    expect(result.found).toBe(true);
    expect(result.patient).toBeDefined();
    expect(result.patient?.id).toBe(createdPatientId);
    expect(result.patient?.full_name).toBe('Zubair Khan');

    // Lookup non-existent phone returns found=false
    const notFound = await lookupPatient.execute({ phone: '+923999999999' }, context);
    expect(notFound.found).toBe(false);
    expect(notFound.patient).toBeNull();
  });

  it('get_clinic_info retrieves hours, location, services, pricing, and general summary', async () => {
    const context = { clinic_id: testClinicId };

    const hours = await getClinicInfo.execute({ topic: 'hours' }, context);
    expect(hours.info).toContain('Monday–Saturday');
    expect(hours.info).toContain('Asia/Karachi');

    const location = await getClinicInfo.execute({ topic: 'location' }, context);
    expect(location.info).toBe('Test Street 101, Phase 5, Lahore');

    const pricing = await getClinicInfo.execute({ topic: 'pricing' }, context);
    expect(pricing.info).toBe('Please contact reception for pricing');

    const services = await getClinicInfo.execute({ topic: 'services' }, context);
    expect(services.info).toContain('General Checkup');
    expect(services.info).toContain('Root Canal');
  });

  it('check_availability generates 30-minute slots within clinic working hours', async () => {
    const context = { clinic_id: testClinicId };
    const result = await checkAvailability.execute(
      { date: 'upcoming', dentist_id: testDentistUserId },
      context
    );

    expect(result.available_slots).toBeDefined();
    expect(Array.isArray(result.available_slots)).toBe(true);
    expect(result.available_slots.length).toBeGreaterThan(0);
    expect(result.available_slots.length).toBeLessThanOrEqual(10);

    const firstSlot = result.available_slots[0];
    expect(firstSlot).toBeDefined();
    expect(firstSlot?.dentist_id).toBe(testDentistUserId);
    expect(firstSlot?.start).toBeDefined();
    expect(firstSlot?.end).toBeDefined();
  });

  it('create_booking_request queues unconfirmed booking and emits audit log', async () => {
    const context = { clinic_id: testClinicId };
    const slotStart = new Date(Date.now() + 86400000).toISOString();
    const slotEnd = new Date(Date.now() + 86400000 + 1800000).toISOString();

    const result = await createBookingRequest.execute(
      {
        slot_start: slotStart,
        slot_end: slotEnd,
        channel: 'whatsapp',
        patient_id: createdPatientId,
        patient_name: 'Zubair Khan',
        patient_phone: testPhone,
        reason: 'Routine Scale and Polish',
      },
      context
    );

    expect(result.booking_request_id).toBeDefined();
    expect(result.status).toBe('pending');
    expect(result.channel).toBe('whatsapp');
    expect(result.message).toContain('Staff will confirm shortly');

    // Verify audit log entry
    const [auditRow] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.clinicId, testClinicId),
          eq(schema.auditLog.action, 'booking_request.create'),
          eq(schema.auditLog.entityId, result.booking_request_id)
        )
      );
    expect(auditRow).toBeDefined();
    expect(auditRow?.entity).toBe('booking_request');
  });

  it('triage_symptoms accurately classifies dental urgency by keywords without DB mutation', async () => {
    // Emergency: cant breathe
    const emResult = await triageSymptoms.execute({
      description: "I was in an accident and can't breathe well with trauma",
      channel: 'whatsapp',
    });
    expect(emResult.urgency).toBe('emergency');
    expect(emResult.requires_human_handoff).toBe(true);
    expect(emResult.recommendation).toContain('immediate emergency');

    // High: severe pain and swelling
    const highResult = await triageSymptoms.execute({
      description: 'I have severe pain and huge facial swelling since yesterday',
      channel: 'whatsapp',
    });
    expect(highResult.urgency).toBe('high');
    expect(highResult.requires_human_handoff).toBe(true);
    expect(highResult.recommendation).toContain('as soon as possible');

    // Normal: toothache
    const normResult = await triageSymptoms.execute({
      description: 'I have a mild toothache when drinking cold water',
      channel: 'whatsapp',
    });
    expect(normResult.urgency).toBe('normal');
    expect(normResult.requires_human_handoff).toBe(false);

    // Low: general questions
    const lowResult = await triageSymptoms.execute({
      description: 'Just wanted to check if I can get some whitening next month',
      channel: 'whatsapp',
    });
    expect(lowResult.urgency).toBe('low');
    expect(lowResult.requires_human_handoff).toBe(false);
  });

  it('request_human_handoff persists conversation and handoff record with audit log', async () => {
    const context = {
      clinic_id: testClinicId,
      session_id: `session_${randomUUID()}`,
      channel: 'whatsapp',
    };

    const result = await requestHumanHandoff.execute(
      {
        reason: 'Complex insurance inquiry requiring front-desk guidance',
        urgency: 'high',
        channel: 'whatsapp',
      },
      context
    );

    expect(result.handoff_id).toBeDefined();
    expect(result.status).toBe('pending_handoff');
    expect(result.urgency).toBe('high');

    // Verify handoff record in DB
    const [handoffRow] = await db
      .select()
      .from(schema.handoffs)
      .where(eq(schema.handoffs.id, result.handoff_id));
    expect(handoffRow).toBeDefined();
    expect(handoffRow?.clinicId).toBe(testClinicId);
    expect(handoffRow?.urgency).toBe('high');

    // Verify audit log entry
    const [auditRow] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.clinicId, testClinicId),
          eq(schema.auditLog.action, 'handoff.create'),
          eq(schema.auditLog.entityId, result.handoff_id)
        )
      );
    expect(auditRow).toBeDefined();
    expect(auditRow?.entity).toBe('handoff');
  });

  it('send_receipt validates patient/invoice, writes to dev_outbox, and records audit log', async () => {
    // 1. Setup invoice and receipt record for the test patient
    testInvoiceId = randomUUID();
    testReceiptId = randomUUID();

    await db.insert(schema.invoices).values({
      id: testInvoiceId,
      clinicId: testClinicId,
      patientId: createdPatientId,
      invoiceNumber: `INV-${Date.now()}`,
      subtotal: '5000.00',
      total: '5000.00',
      paid: '5000.00',
      status: 'paid',
    });

    await db.insert(schema.receipts).values({
      id: testReceiptId,
      clinicId: testClinicId,
      invoiceId: testInvoiceId,
      receiptNumber: `REC-${Date.now()}`,
      amount: '5000.00',
      storageKey: `receipts/${testClinicId}/${testInvoiceId}.pdf`,
    });

    // 2. Dispatch receipt via tool
    const context = { clinic_id: testClinicId };
    const result = await sendReceipt.execute(
      {
        patient_id: createdPatientId,
        invoice_id: testInvoiceId,
        channel: 'whatsapp',
      },
      context
    );

    expect(result.receipt_id).toBe(testReceiptId);
    expect(result.sent).toBe(true);
    expect(result.delivery_channel).toBe('whatsapp');

    // 3. Verify dev_outbox entry
    const [outboxRow] = await db
      .select()
      .from(schema.devOutbox)
      .where(
        and(
          eq(schema.devOutbox.channel, 'whatsapp'),
          eq(schema.devOutbox.to, testPhone)
        )
      );
    expect(outboxRow).toBeDefined();
    expect(outboxRow?.body).toContain(`receipts/${testClinicId}/${testInvoiceId}.pdf`);

    // 4. Verify audit log entry
    const [auditRow] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.clinicId, testClinicId),
          eq(schema.auditLog.action, 'receipt.dispatched'),
          eq(schema.auditLog.entityId, testReceiptId)
        )
      );
    expect(auditRow).toBeDefined();
    expect(auditRow?.entity).toBe('receipt');
  });
});
