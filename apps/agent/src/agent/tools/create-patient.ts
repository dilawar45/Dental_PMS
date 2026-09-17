import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'create_patient';
export const TOOL_DESCRIPTION = 'Register a new patient record with consent and demographic details.';

export const createPatientInputSchema = z.object({
  full_name: z.string().describe('Full name of the patient'),
  phone: z.string().describe('Patient telephone number in E.164 format'),
  consent_type: z.enum(['data_processing', 'marketing', 'reminders']).default('data_processing').describe('Patient consent type'),
  email: z.string().email().optional().or(z.literal('')).describe('Optional email address'),
  dob: z.string().optional().describe('Date of birth in YYYY-MM-DD format'),
  gender: z.string().optional().describe('Gender description (e.g., male, female, other)'),
});

export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

export interface CreatePatientOutput {
  patient_id: string;
  full_name: string;
  phone: string;
  status: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      full_name: { type: 'string', description: 'Full name of the patient' },
      phone: { type: 'string', description: 'Patient telephone number in E.164 format' },
      consent_type: {
        type: 'string',
        enum: ['data_processing', 'marketing', 'reminders'],
        default: 'data_processing',
        description: 'Patient consent type',
      },
      email: { type: 'string', description: 'Optional email address' },
      dob: { type: 'string', description: 'Date of birth in YYYY-MM-DD format' },
      gender: { type: 'string', description: 'Gender description (e.g., male, female, other)' },
    },
    required: ['full_name', 'phone'],
  },
};

export async function execute(
  _input: CreatePatientInput,
  _context?: Record<string, unknown>
): Promise<CreatePatientOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
