import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'triage_symptoms';
export const TOOL_DESCRIPTION = 'Evaluate dental symptom severity and determine clinical escalation urgency without diagnosis.';

export const triageSymptomsInputSchema = z.object({
  description: z.string().describe('Patient description of dental symptoms, pain, or trauma'),
  channel: z
    .enum(['whatsapp', 'voice', 'instagram', 'facebook', 'google'])
    .describe('Communication channel'),
});

export type TriageSymptomsInput = z.infer<typeof triageSymptomsInputSchema>;

export interface TriageSymptomsOutput {
  urgency: 'low' | 'normal' | 'high' | 'emergency';
  channel: 'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google';
  requires_human_handoff: boolean;
  recommendation: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      description: {
        type: 'string',
        description: 'Patient description of dental symptoms, pain, or trauma',
      },
      channel: {
        type: 'string',
        enum: ['whatsapp', 'voice', 'instagram', 'facebook', 'google'],
        description: 'Communication channel',
      },
    },
    required: ['description', 'channel'],
  },
};

export async function execute(
  _input: TriageSymptomsInput,
  _context?: Record<string, unknown>
): Promise<TriageSymptomsOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
