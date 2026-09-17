import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { bookingRequests, patients } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';
import { writeAuditLog } from '../../db/audit';

export const TOOL_NAME = 'create_booking_request';
export const TOOL_DESCRIPTION =
  'Queue an unconfirmed patient appointment booking request for clinic staff triage.';

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
  input: CreateBookingRequestInput,
  context?: Record<string, unknown>
): Promise<CreateBookingRequestOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    // 1. If patient_id provided, verify existence within this clinic
    if (input.patient_id) {
      const [existingPatient] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.id, input.patient_id),
            eq(patients.clinicId, clinicId),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (!existingPatient) {
        throw new Error(`Patient ${input.patient_id} does not exist in this clinic`);
      }
    }

    // 2. Insert unconfirmed booking request
    const [request] = await tx
      .insert(bookingRequests)
      .values({
        clinicId,
        patientId: input.patient_id || null,
        patientName: input.patient_name?.trim() || null,
        patientPhone: input.patient_phone?.trim() || null,
        requestedSlotStart: new Date(input.slot_start),
        requestedSlotEnd: new Date(input.slot_end),
        reason: input.reason?.trim() || null,
        notes: input.notes?.trim() || null,
        status: 'pending',
        requestedVia: input.channel,
      })
      .returning();

    if (!request) {
      throw new Error('Failed to insert booking request');
    }

    // 3. Write immutable audit log
    await writeAuditLog(tx, clinicId, {
      action: 'booking_request.create',
      entity: 'booking_request',
      entityId: request.id,
      meta: {
        slot_start: input.slot_start,
        slot_end: input.slot_end,
        channel: input.channel,
        patient_id: input.patient_id ?? null,
      },
    });

    return {
      booking_request_id: request.id,
      status: 'pending',
      channel: input.channel,
      message: 'Your request has been submitted. Staff will confirm shortly.',
    };
  });
}
