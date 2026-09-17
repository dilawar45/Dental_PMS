import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'send_receipt';
export const TOOL_DESCRIPTION = 'Issue and dispatch a payment receipt or invoice document link to a patient.';

export const sendReceiptInputSchema = z.object({
  patient_id: z.string().describe('UUID of the patient'),
  invoice_id: z.string().describe('UUID or identifier of the invoice/receipt to dispatch'),
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
  _input: SendReceiptInput,
  _context?: Record<string, unknown>
): Promise<SendReceiptOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
