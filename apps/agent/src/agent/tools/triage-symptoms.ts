import { z } from 'zod';
import type { ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'triage_symptoms';
export const TOOL_DESCRIPTION =
  'Evaluate dental symptom severity and determine clinical escalation urgency without diagnosis.';

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
  input: TriageSymptomsInput,
  _context?: Record<string, unknown>
): Promise<TriageSymptomsOutput> {
  const desc = input.description.toLowerCase();

  let urgency: 'emergency' | 'high' | 'normal' | 'low' = 'low';

  // 1. Emergency criteria
  const emergencyKeywords = [
    "can't breathe",
    'cant breathe',
    'swallowing',
    'knocked out',
    'avulsion',
    'trauma',
    'uncontrolled bleeding',
  ];
  const hasFacialSwellingAndFever = desc.includes('facial swelling') && desc.includes('fever');

  // 2. High urgency criteria
  const highKeywords = ['severe pain', 'unbearable', 'swelling', 'broken tooth', 'abscess'];
  const hasChildAndPain = desc.includes('child') && desc.includes('pain');

  // 3. Normal urgency criteria
  const normalKeywords = ['toothache', 'sensitive', 'mild pain', 'discomfort'];

  if (emergencyKeywords.some((kw) => desc.includes(kw)) || hasFacialSwellingAndFever) {
    urgency = 'emergency';
  } else if (highKeywords.some((kw) => desc.includes(kw)) || hasChildAndPain) {
    urgency = 'high';
  } else if (normalKeywords.some((kw) => desc.includes(kw))) {
    urgency = 'normal';
  } else {
    urgency = 'low';
  }

  const requiresHumanHandoff = urgency === 'emergency' || urgency === 'high';

  let recommendation = '';
  switch (urgency) {
    case 'emergency':
      recommendation = 'Seek immediate emergency dental care or call our clinic right away.';
      break;
    case 'high':
      recommendation = 'Please come in as soon as possible. I am notifying our clinical team now.';
      break;
    case 'normal':
      recommendation = 'This sounds manageable. Would you like to book an appointment?';
      break;
    case 'low':
    default:
      recommendation = 'Thanks for letting me know. Let me know if it worsens.';
      break;
  }

  return {
    urgency,
    channel: input.channel,
    requires_human_handoff: requiresHumanHandoff,
    recommendation,
  };
}
