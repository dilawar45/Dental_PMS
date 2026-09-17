import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'get_clinic_info';
export const TOOL_DESCRIPTION = 'Retrieve clinic operating hours, location, services, pricing, or general practice information.';

export const getClinicInfoInputSchema = z.object({
  topic: z
    .enum(['hours', 'location', 'services', 'pricing', 'general'])
    .default('general')
    .describe('Category of clinic information requested: hours, location, services, pricing, general'),
});

export type GetClinicInfoInput = z.infer<typeof getClinicInfoInputSchema>;

export interface GetClinicInfoOutput {
  topic: string;
  info: string;
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        enum: ['hours', 'location', 'services', 'pricing', 'general'],
        default: 'general',
        description: 'Category of clinic information requested',
      },
    },
  },
};

export async function execute(
  _input: GetClinicInfoInput,
  _context?: Record<string, unknown>
): Promise<GetClinicInfoOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
