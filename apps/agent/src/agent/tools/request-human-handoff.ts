import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { conversations, handoffs } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';
import { writeAuditLog } from '../../db/audit';

export const TOOL_NAME = 'request_human_handoff';
export const TOOL_DESCRIPTION =
  'Escalate an ongoing patient conversation to a human clinic receptionist or staff member.';

export const requestHumanHandoffInputSchema = z.object({
  reason: z.string().describe('Reason for escalating to human receptionist'),
  urgency: z
    .enum(['low', 'normal', 'high', 'emergency'])
    .default('normal')
    .describe('Escalation urgency level'),
  channel: z
    .enum(['whatsapp', 'voice', 'instagram', 'facebook', 'google'])
    .describe('Communication channel'),
});

export type RequestHumanHandoffInput = z.infer<typeof requestHumanHandoffInputSchema>;

export interface RequestHumanHandoffOutput {
  handoff_id: string;
  status: 'open' | 'pending_handoff' | 'closed';
  urgency: 'low' | 'normal' | 'high' | 'emergency';
  channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google';
  message: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Reason for escalating to human receptionist',
      },
      urgency: {
        type: 'string',
        enum: ['low', 'normal', 'high', 'emergency'],
        default: 'normal',
        description: 'Escalation urgency level',
      },
      channel: {
        type: 'string',
        enum: ['whatsapp', 'voice', 'instagram', 'facebook', 'google'],
        description: 'Communication channel',
      },
    },
    required: ['reason', 'channel'],
  },
};

export async function execute(
  input: RequestHumanHandoffInput,
  context?: Record<string, unknown>
): Promise<RequestHumanHandoffOutput> {
  const clinicId = getClinicIdFromContext(context);
  const sessionId =
    (context?.['session_id'] as string) ||
    (context?.['sender'] as string) ||
    'session_default';

  return await runInClinic(clinicId, async (tx) => {
    // 1. Resolve or create conversation thread
    const [existingConv] = await tx
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.clinicId, clinicId),
          eq(conversations.channel, input.channel),
          eq(conversations.externalThreadId, sessionId)
        )
      )
      .limit(1);

    let conversationId: string;
    if (!existingConv) {
      const [newConv] = await tx
        .insert(conversations)
        .values({
          clinicId,
          channel: input.channel,
          externalThreadId: sessionId,
          status: 'pending_handoff',
          lastMessageAt: new Date(),
        })
        .returning();
      conversationId = newConv!.id;
    } else {
      conversationId = existingConv.id;
      await tx
        .update(conversations)
        .set({
          status: 'pending_handoff',
          lastMessageAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, conversationId));
    }

    // 2. Insert handoff record
    const [handoff] = await tx
      .insert(handoffs)
      .values({
        clinicId,
        conversationId,
        reason: input.reason.trim(),
        urgency: input.urgency,
      })
      .returning();

    if (!handoff) {
      throw new Error('Failed to create handoff record');
    }

    // 3. Write immutable audit log
    await writeAuditLog(tx, clinicId, {
      action: 'handoff.create',
      entity: 'handoff',
      entityId: handoff.id,
      meta: {
        reason: input.reason,
        urgency: input.urgency,
        channel: input.channel,
        conversation_id: conversationId,
      },
    });

    return {
      handoff_id: handoff.id,
      status: 'pending_handoff',
      urgency: input.urgency,
      channel: input.channel,
      message: 'Our team has been notified and will reach out shortly.',
    };
  });
}
