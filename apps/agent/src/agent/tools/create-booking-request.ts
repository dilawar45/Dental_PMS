import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'create_booking_request';
export const TOOL_DESCRIPTION = 'Queue an unconfirmed patient appointment booking request for clinic staff triage.';

export const createBookingRequestInputSchema = z.object({
  slot_start: z.string().describe('Requested appointment start ISO-8601 timestamp'),
  slot_end: z.string().describe('Requested appointment end ISO-8601 timestamp'),
  channel: z
    .enum(['whatsapp', 'voice', 'instagram', 'facebook', 'google', 'staff'])
    .describe('Booking origin channel'),
  patient_id: z.string().uuid().optional().describe('Optional UUID of registered patient'),
  patient_name: z.string().optional().describe('Prospective patient full name'),
  patient_phone: z.string().optional().describe('Prospective patient telephone number'),
  reason: z.string().optional().describe('Clinical reason or service required'),
  notes: z.string().optional().describe('Additional triage or patient notes'),
});

export type CreateBookingRequestInput = z.infer<typeof createBookingRequestInputSchema>;

export interface CreateBookingRequestOutput {
  booking_request_id: string;
  status: 'pending' | 'approved' | 'rejected';
  channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google' | 'staff';
  message: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      slot_start: { type: 'string', description: 'Requested appointment start ISO-8601 timestamp' },
      slot_end: { type: 'string', description: 'Requested appointment end ISO-8601 timestamp' },
      channel: {
        type: 'string',
        enum: ['whatsapp', 'voice', 'instagram', 'facebook', 'google', 'staff'],
        description: 'Booking origin channel',
      },
      patient_id: { type: 'string', description: 'Optional UUID of registered patient' },
      patient_name: { type: 'string', description: 'Prospective patient full name' },
      patient_phone: { type: 'string', description: 'Prospective patient telephone number' },
      reason: { type: 'string', description: 'Clinical reason or service required' },
      notes: { type: 'string', description: 'Additional triage or patient notes' },
    },
    required: ['slot_start', 'slot_end', 'channel'],
  },
};

export async function execute(
  _input: CreateBookingRequestInput,
  _context?: Record<string, unknown>
): Promise<CreateBookingRequestOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
