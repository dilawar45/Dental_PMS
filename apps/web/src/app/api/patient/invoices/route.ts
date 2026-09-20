import { NextResponse } from 'next/server';
import { and, eq, desc } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { invoices } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const invoiceList = await withClinic(auth.clinic_id, async (tx) => {
      const rows = await tx
        .select({
          id: invoices.id,
          invoice_number: invoices.invoiceNumber,
          items: invoices.items,
          subtotal: invoices.subtotal,
          tax: invoices.tax,
          total: invoices.total,
          paid: invoices.paid,
          status: invoices.status,
          notes: invoices.notes,
          issued_at: invoices.issuedAt,
        })
        .from(invoices)
        .where(
          and(
            eq(invoices.clinicId, auth.clinic_id),
            eq(invoices.patientId, auth.patient_id)
          )
        )
        .orderBy(desc(invoices.issuedAt));

      return rows.map((inv) => {
        const totalNum = parseFloat(inv.total || '0');
        const paidNum = parseFloat(inv.paid || '0');
        const balance = Math.max(0, totalNum - paidNum).toFixed(2);

        return {
          ...inv,
          balance,
        };
      });
    });

    return withCors(NextResponse.json({ invoices: invoiceList }), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
