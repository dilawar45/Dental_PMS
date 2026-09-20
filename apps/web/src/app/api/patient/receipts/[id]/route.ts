import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { receipts, invoices } from '@dental-pms/db/schema';
import { getStorageProvider } from '@dental-pms/integrations';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requirePatient(req);
    const { id: receiptId } = await params;

    const db = getDefaultDb();

    const receiptRecord = await withClinic(auth.clinic_id, async (tx) => {
      const [row] = await tx
        .select({
          id: receipts.id,
          receiptNumber: receipts.receiptNumber,
          amount: receipts.amount,
          storageKey: receipts.storageKey,
          issuedAt: receipts.issuedAt,
        })
        .from(receipts)
        .innerJoin(invoices, eq(receipts.invoiceId, invoices.id))
        .where(
          and(
            eq(receipts.id, receiptId),
            eq(receipts.clinicId, auth.clinic_id),
            eq(invoices.patientId, auth.patient_id)
          )
        )
        .limit(1);

      return row;
    });

    if (!receiptRecord) {
      return withCors(
        NextResponse.json({ error: 'Receipt not found' }, { status: 404 }),
        req
      );
    }

    // Generate signed download URL via storage provider
    const storage = getStorageProvider(db);
    const { url } = await storage.getSignedUrl('receipts', receiptRecord.storageKey, 3600);

    return withCors(
      NextResponse.json({
        id: receiptRecord.id,
        receipt_number: receiptRecord.receiptNumber,
        amount: receiptRecord.amount,
        url,
      }),
      req
    );
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
