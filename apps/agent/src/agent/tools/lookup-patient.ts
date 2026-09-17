import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'lookup_patient';
export const TOOL_DESCRIPTION = 'Lookup existing patient details by telephone number.';

export const lookupPatientInputSchema = z.object({
  phone: z.string().describe('Patient phone number in E.164 format (e.g., +923001234501)'),
});

export type LookupPatientInput = z.infer<typeof lookupPatientInputSchema>;

export interface PatientRecord {
  id: string;
  full_name: string;
  phone: string;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
}

export interface LookupPatientOutput {
  found: boolean;
  patient?: PatientRecord | null;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      phone: {
        type: 'string',
        description: 'Patient phone number in E.164 format (e.g., +923001234501)',
      },
    },
    required: ['phone'],
  },
};

export async function execute(
  _input: LookupPatientInput,
  _context?: Record<string, unknown>
): Promise<LookupPatientOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
