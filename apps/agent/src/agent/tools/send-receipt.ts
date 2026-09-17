import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { invoices, receipts, patients, devOutbox } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';
import { writeAuditLog } from '../../db/audit';

export const TOOL_NAME = 'send_receipt';
export const TOOL_DESCRIPTION =
  'Issue and dispatch a payment receipt or invoice document link to a patient.';

export const sendReceiptInputSchema = z.object({
  patient_id: z.string().uuid().describe('UUID of the patient'),
  invoice_id: z.string().uuid().describe('UUID or identifier of the invoice/receipt to dispatch'),
  channel: z
    .enum(['whatsapp', 'voice', 'instagram', 'facebook', 'google'])
    .describe('Delivery channel'),
});

export type SendReceiptInput = z.infer<typeof sendReceiptInputSchema>;

export interface SendReceiptOutput {
  receipt_id: string;
  file_kind: 'xray' | 'photo' | 'document' | 'receipt';
  sent: boolean;
  delivery_channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google';
  message: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      patient_id: { type: 'string', description: 'UUID of the patient' },
      invoice_id: { type: 'string', description: 'UUID or identifier of the invoice/receipt to dispatch' },
      channel: {
        type: 'string',
        enum: ['whatsapp', 'voice', 'instagram', 'facebook', 'google'],
        description: 'Delivery channel',
      },
    },
    required: ['patient_id', 'invoice_id', 'channel'],
  },
};

export async function execute(
  input: SendReceiptInput,
  context?: Record<string, unknown>
): Promise<SendReceiptOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    // 1. Verify invoice belongs to patient and clinic
    const [invoice] = await tx
      .select({ id: invoices.id, patientId: invoices.patientId })
      .from(invoices)
      .where(
        and(
          eq(invoices.id, input.invoice_id),
          eq(invoices.patientId, input.patient_id),
          eq(invoices.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!invoice) {
      throw new Error(
        `Invoice ${input.invoice_id} not found for patient ${input.patient_id} in this clinic`
      );
    }

    // 2. Verify receipt exists with storage key
    const [receipt] = await tx
      .select({ id: receipts.id, storageKey: receipts.storageKey })
      .from(receipts)
      .where(
        and(
          eq(receipts.invoiceId, input.invoice_id),
          eq(receipts.clinicId, clinicId)
        )
      )
      .limit(1);

    if (!receipt || !receipt.storageKey) {
      throw new Error(`No receipt document with storage_key found for invoice ${input.invoice_id}`);
    }

    // 3. Resolve patient destination phone
    const [patient] = await tx
      .select({ phone: patients.phone })
      .from(patients)
      .where(and(eq(patients.id, input.patient_id), eq(patients.clinicId, clinicId)))
      .limit(1);

    const recipient = patient?.phone || input.patient_id;

    // 4. Log outbound dispatch into dev_outbox table (Mock delivery)
    await tx.insert(devOutbox).values({
      channel: input.channel,
      from: 'system',
      to: recipient,
      body: `Receipt link: ${receipt.storageKey}`,
      provider: 'mock',
      direction: 'outbound',
      metadata: JSON.stringify({ invoice_id: input.invoice_id, receipt_id: receipt.id }),
    });

    // 5. Write immutable audit log
    await writeAuditLog(tx, clinicId, {
      action: 'receipt.dispatched',
      entity: 'receipt',
      entityId: receipt.id,
      meta: {
        invoice_id: input.invoice_id,
        channel: input.channel,
        recipient,
      },
    });

    return {
      receipt_id: receipt.id,
      file_kind: 'receipt',
      sent: true,
      delivery_channel: input.channel,
      message: `Payment receipt dispatched via ${input.channel}.`,
    };
  });
}
