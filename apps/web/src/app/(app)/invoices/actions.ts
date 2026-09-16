'use server';

import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { invoices, receipts, patients, appointments, clinics, users, files } from '@dental-pms/db/schema';
import { logAudit } from '@/lib/audit';
import { getPdfProvider } from '@dental-pms/integrations/pdf';
import { getStorageProvider } from '@dental-pms/integrations/storage';
import {
  createInvoiceSchema,
  recordPaymentSchema,
  voidInvoiceSchema,
  type CreateInvoiceInput,
  type RecordPaymentInput,
  type VoidInvoiceInput,
} from './schemas';
import {
  calculateInvoiceTotals,
  addMoney,
  subtractMoney,
  toCents,
  deriveInvoiceStatus,
  formatPKR,
} from '@/lib/money';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Creates a new patient billing invoice with integer-cents calculations and line items.
 * Restricted to Owner and Receptionist roles.
 */
export async function createInvoiceAction(
  rawInput: CreateInvoiceInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = createInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid invoice data',
    };
  }

  const { patientId, appointmentId, lineItems, taxRate, notes } = parsed.data;

  // Decimal-safe integer-cents calculation
  const totals = calculateInvoiceTotals(lineItems, taxRate);

  // Line items with individual row subtotals
  const formattedItems = lineItems.map((item) => {
    const itemSubtotal = (parseFloat(item.amount) * item.quantity).toFixed(2);
    return {
      description: item.description,
      amount: parseFloat(item.amount).toFixed(2),
      quantity: item.quantity,
      subtotal: itemSubtotal,
    };
  });

  try {
    const created = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Verify patient belongs to this clinic
        const [patientRecord] = await tx
          .select({ id: patients.id, fullName: patients.fullName })
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!patientRecord) {
          throw new Error('Patient not found in this clinic');
        }

        // 2. If appointmentId is provided, verify appointment belongs to this patient & clinic
        if (appointmentId) {
          const [apptRecord] = await tx
            .select({ id: appointments.id })
            .from(appointments)
            .where(
              and(
                eq(appointments.id, appointmentId),
                eq(appointments.clinicId, user.clinicId),
                eq(appointments.patientId, patientId)
              )
            );

          if (!apptRecord) {
            throw new Error('Specified appointment does not belong to this patient');
          }
        }

        const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const tempId = Math.floor(1000 + Math.random() * 9000);
        const invoiceNum = `INV-${dateCode}-${tempId}`;

        // 3. Insert invoice row
        const [newInv] = await tx
          .insert(invoices)
          .values({
            clinicId: user.clinicId,
            patientId,
            appointmentId: appointmentId || null,
            invoiceNumber: invoiceNum,
            items: formattedItems,
            subtotal: totals.subtotal,
            taxRate: parseFloat(taxRate).toFixed(2),
            tax: totals.tax,
            total: totals.total,
            paid: '0.00',
            status: 'unpaid',
            notes: notes || null,
            issuedAt: new Date(),
          })
          .returning();

        if (!newInv) {
          throw new Error('Failed to insert invoice');
        }

        // 4. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'invoice.create',
          entity: 'invoice',
          entityId: newInv.id,
          meta: {
            invoiceNumber: newInv.invoiceNumber,
            patientId,
            patientName: patientRecord.fullName,
            total: totals.total,
            itemsCount: formattedItems.length,
          },
        });

        return newInv;
      }
    );

    revalidatePath('/invoices');
    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: { id: created.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create invoice',
    };
  }
}

/**
 * Records a payment against an invoice, creates a matching receipt, and updates paid balance.
 * Restricted to Owner and Receptionist roles.
 */
export async function recordPaymentAction(
  rawInput: RecordPaymentInput
): Promise<ActionResult<{ receiptId: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = recordPaymentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid payment data',
    };
  }

  const { invoiceId, amount, method, notes } = parsed.data;
  const payCents = toCents(amount);

  try {
    const receiptResult = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Fetch current invoice
        const [inv] = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, user.clinicId)));

        if (!inv) {
          throw new Error('Invoice not found');
        }

        if (inv.status === 'void') {
          throw new Error('Cannot record payment on a voided invoice');
        }

        const totalCents = toCents(inv.total);
        const currentPaidCents = toCents(inv.paid);
        const remainingBalanceCents = totalCents - currentPaidCents;

        if (payCents > remainingBalanceCents) {
          throw new Error(
            `Payment amount (${formatPKR(amount)}) exceeds remaining balance (${formatPKR(
              (remainingBalanceCents / 100).toFixed(2)
            )})`
          );
        }

        const newPaidStr = addMoney(inv.paid, amount);
        const newStatus = deriveInvoiceStatus(inv.total, newPaidStr, inv.status);

        // 2. Update invoice paid amount & status
        await tx
          .update(invoices)
          .set({
            paid: newPaidStr,
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, user.clinicId)));

        const dateCode = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const tempId = Math.floor(1000 + Math.random() * 9000);
        const receiptNum = `RCP-${dateCode}-${tempId}`;

        // 3. Create receipt row
        const [rcpt] = await tx
          .insert(receipts)
          .values({
            clinicId: user.clinicId,
            invoiceId,
            receiptNumber: receiptNum,
            amount: parseFloat(amount).toFixed(2),
            method,
            receivedBy: user.id,
            storageKey: `pending/${user.clinicId}/${receiptNum}.pdf`,
            notes: notes || null,
            issuedAt: new Date(),
          })
          .returning();

        if (!rcpt) {
          throw new Error('Failed to generate payment receipt');
        }

        // 4. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'receipt.create',
          entity: 'receipt',
          entityId: rcpt.id,
          meta: {
            invoiceId,
            receiptNumber: rcpt.receiptNumber,
            amount: rcpt.amount,
            method,
            newInvoiceStatus: newStatus,
          },
        });

        return rcpt;
      }
    );

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true, data: { receiptId: receiptResult.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to record payment',
    };
  }
}

/**
 * Generates a PDF receipt using the PDF provider, uploads it via storage provider,
 * and records it in the files table.
 * Restricted to Owner and Receptionist roles.
 */
export async function generateReceiptPdfAction(
  receiptId: string
): Promise<ActionResult<{ storageKey: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  try {
    const generated = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Fetch receipt details joined with invoice, patient, clinic, staff
        const [rcpt] = await tx
          .select({
            id: receipts.id,
            receiptNumber: receipts.receiptNumber,
            amount: receipts.amount,
            method: receipts.method,
            issuedAt: receipts.issuedAt,
            storageKey: receipts.storageKey,
            invoiceId: receipts.invoiceId,
            receivedByName: users.fullName,
            invoiceNumber: invoices.invoiceNumber,
            invoiceTotal: invoices.total,
            invoicePaid: invoices.paid,
            invoiceItems: invoices.items,
            patientId: invoices.patientId,
            patientName: patients.fullName,
            patientPhone: patients.phone,
            clinicName: clinics.name,
            clinicAddress: clinics.address,
            clinicPhone: clinics.phone,
          })
          .from(receipts)
          .innerJoin(invoices, eq(receipts.invoiceId, invoices.id))
          .innerJoin(patients, eq(invoices.patientId, patients.id))
          .innerJoin(clinics, eq(receipts.clinicId, clinics.id))
          .leftJoin(users, eq(receipts.receivedBy, users.id))
          .where(and(eq(receipts.id, receiptId), eq(receipts.clinicId, user.clinicId)));

        if (!rcpt) {
          throw new Error('Receipt not found');
        }

        // 2. Prepare receipt payload
        const receiptPayload = {
          clinic: {
            name: rcpt.clinicName,
            address: rcpt.clinicAddress,
            phone: rcpt.clinicPhone,
          },
          patient: {
            name: rcpt.patientName,
            phone: rcpt.patientPhone,
          },
          invoice: {
            number: rcpt.invoiceNumber || rcpt.invoiceId.slice(0, 8),
            total: rcpt.invoiceTotal,
            paid: rcpt.invoicePaid,
            items: rcpt.invoiceItems,
          },
          receipt: {
            number: rcpt.receiptNumber || rcpt.id.slice(0, 8),
            amount: rcpt.amount,
            method: rcpt.method,
            issuedAt: rcpt.issuedAt.toISOString(),
            receivedBy: rcpt.receivedByName || 'Clinic Staff',
          },
        };

        // 3. Call PDF provider from packages/integrations
        const pdfProvider = getPdfProvider(db);
        const pdfBuffer = await pdfProvider.generate('receipt', receiptPayload);

        // 4. Save to storage provider
        const storageProvider = getStorageProvider(db);
        const destinationKey = `${user.clinicId}/${rcpt.invoiceId}_${rcpt.id}.pdf`;
        await storageProvider.upload('receipts', destinationKey, pdfBuffer);

        // 5. Store file record in files table
        await tx.insert(files).values({
          clinicId: user.clinicId,
          patientId: rcpt.patientId,
          kind: 'receipt',
          storageKey: destinationKey,
          mime: 'application/pdf',
          size: pdfBuffer.length,
          uploadedBy: user.id,
          uploadedAt: new Date(),
        });

        // 6. Update receipt storage key
        await tx
          .update(receipts)
          .set({
            storageKey: destinationKey,
            updatedAt: new Date(),
          })
          .where(and(eq(receipts.id, receiptId), eq(receipts.clinicId, user.clinicId)));

        // 7. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'receipt.pdf_generated',
          entity: 'receipt',
          entityId: receiptId,
          meta: {
            receiptNumber: rcpt.receiptNumber,
            storageKey: destinationKey,
            sizeBytes: pdfBuffer.length,
          },
        });

        return { storageKey: destinationKey };
      }
    );

    revalidatePath(`/invoices`);
    return { success: true, data: generated };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate PDF receipt',
    };
  }
}

/**
 * Voids an invoice and prevents further payments or modifications.
 * Strictly restricted to Owner role only.
 */
export async function voidInvoiceAction(
  rawInput: VoidInvoiceInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner']);

  const parsed = voidInvoiceSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid void reason payload',
    };
  }

  const { invoiceId, reason } = parsed.data;

  try {
    await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const [inv] = await tx
          .select()
          .from(invoices)
          .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, user.clinicId)));

        if (!inv) {
          throw new Error('Invoice not found');
        }

        if (inv.status === 'void') {
          throw new Error('Invoice is already marked as void');
        }

        const previousStatus = inv.status;

        await tx
          .update(invoices)
          .set({
            status: 'void',
            notes: inv.notes ? `${inv.notes}\n[VOIDED]: ${reason}` : `[VOIDED]: ${reason}`,
            updatedAt: new Date(),
          })
          .where(and(eq(invoices.id, invoiceId), eq(invoices.clinicId, user.clinicId)));

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'invoice.void',
          entity: 'invoice',
          entityId: invoiceId,
          meta: {
            previousStatus,
            reason,
          },
        });
      }
    );

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    return { success: true, data: { id: invoiceId } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to void invoice',
    };
  }
}
