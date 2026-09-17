import { z } from 'zod';
import { NotImplementedError, type ToolSpec } from '../../llm/base';

export const TOOL_NAME = 'check_availability';
export const TOOL_DESCRIPTION = 'Query available appointment calendar slots for a date range, dentist, or procedure.';

export const checkAvailabilityInputSchema = z.object({
  date: z.string().describe("Target date in YYYY-MM-DD format (or 'today', 'upcoming')"),
  dentist_id: z.string().uuid().optional().describe('Optional UUID of specific dentist'),
  procedure: z.string().optional().describe('Optional procedure name or code'),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilityInputSchema>;

export interface Slot {
  start_at: string;
  end_at: string;
  dentist_id: string;
  dentist_name?: string | null;
}

export interface CheckAvailabilityOutput {
  date: string;
  available_slots: Slot[];
}

export const TOOL_SPEC: ToolSpec = {
  name: TOOL_NAME,
  description: TOOL_DESCRIPTION,
  parameters: {
    type: 'object',
    properties: {
      date: {
        type: 'string',
        description: "Target date in YYYY-MM-DD format (or 'today', 'upcoming')",
      },
      dentist_id: {
        type: 'string',
        description: 'Optional UUID of specific dentist',
      },
      procedure: {
        type: 'string',
        description: 'Optional procedure name or code',
      },
    },
    required: ['date'],
  },
};

export async function execute(
  _input: CheckAvailabilityInput,
  _context?: Record<string, unknown>
): Promise<CheckAvailabilityOutput> {
  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
