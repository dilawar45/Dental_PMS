import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GET } from '@/app/api/patient/invoices/route';
import {
  createTestClinic,
  createTestPatient,
  cleanupClinic,
  testDb,
} from './test-helper';
import { signPatientToken } from '@/lib/patient-auth';
import { invoices } from '@dental-pms/db/schema';

describe('GET /api/patient/invoices', () => {
  let clinicId: string;
  let patientAId: string;
  let patientBId: string;
  let tokenA: string;

  beforeAll(async () => {
    const clinic = await createTestClinic('Invoices Test Clinic');
    clinicId = clinic.id;

    const patientA = await createTestPatient(clinicId, '+923007788990', 'Billing Patient A');
    patientAId = patientA.id;
    tokenA = signPatientToken(patientAId, clinicId);

    const patientB = await createTestPatient(clinicId, '+923007788991', 'Billing Patient B');
    patientBId = patientB.id;

    // Create invoice for Patient A (Total 5000, Paid 2000 -> Balance 3000)
    await testDb.insert(invoices).values({
      clinicId,
      patientId: patientAId,
      invoiceNumber: `INV-${Date.now()}-A`,
      items: [
        {
          description: 'Root Canal Treatment',
          amount: '5000.00',
          quantity: 1,
          subtotal: '5000.00',
        },
      ],
      total: '5000.00',
      paid: '2000.00',
      status: 'partially_paid',
    });

    // Create invoice for Patient B
    await testDb.insert(invoices).values({
      clinicId,
      patientId: patientBId,
      invoiceNumber: `INV-${Date.now()}-B`,
      items: [
        {
          description: 'Dental Filling',
          amount: '2500.00',
          quantity: 1,
          subtotal: '2500.00',
        },
      ],
      total: '2500.00',
      paid: '2500.00',
      status: 'paid',
    });
  });

  afterAll(async () => {
    await cleanupClinic(clinicId);
  });

  it('returns only the caller invoices with accurate remaining balance calculation', async () => {
    const req = new Request('http://localhost:3000/api/patient/invoices', {
      method: 'GET',
      headers: { Authorization: `Bearer ${tokenA}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      invoices: Array<{
        id: string;
        invoice_number: string;
        total: string;
        paid: string;
        balance: string;
        status: string;
      }>;
    };

    expect(data.invoices.length).toBe(1);
    expect(data.invoices[0]?.total).toBe('5000.00');
    expect(data.invoices[0]?.paid).toBe('2000.00');
    expect(data.invoices[0]?.balance).toBe('3000.00');
  });
});
