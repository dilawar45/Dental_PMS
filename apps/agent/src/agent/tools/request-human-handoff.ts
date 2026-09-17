import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'request_human_handoff';
export const TOOL_DESCRIPTION = 'Escalate an ongoing patient conversation to a human clinic receptionist or staff member.';

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
  _input: RequestHumanHandoffInput,
  _context?: Record<string, unknown>
): Promise<RequestHumanHandoffOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
