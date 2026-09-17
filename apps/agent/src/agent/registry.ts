/**
 * Central tool registry and execution dispatcher.
 */

import { NotImplementedError, type ToolSpec } from '../llm/base';
import {
  lookupPatient,
  createPatient,
  getClinicInfo,
  checkAvailability,
  createBookingRequest,
  triageSymptoms,
  requestHumanHandoff,
  sendReceipt,
} from './tools';

export const TOOL_REGISTRY: Record<string, ToolSpec> = {
  [lookupPatient.TOOL_NAME]: lookupPatient.TOOL_SPEC,
  [createPatient.TOOL_NAME]: createPatient.TOOL_SPEC,
  [getClinicInfo.TOOL_NAME]: getClinicInfo.TOOL_SPEC,
  [checkAvailability.TOOL_NAME]: checkAvailability.TOOL_SPEC,
  [createBookingRequest.TOOL_NAME]: createBookingRequest.TOOL_SPEC,
  [triageSymptoms.TOOL_NAME]: triageSymptoms.TOOL_SPEC,
  [requestHumanHandoff.TOOL_NAME]: requestHumanHandoff.TOOL_SPEC,
  [sendReceipt.TOOL_NAME]: sendReceipt.TOOL_SPEC,
};

export async function dispatchTool(
  name: string,
  _args: Record<string, unknown>,
  _context?: Record<string, unknown>
): Promise<unknown> {
  if (!(name in TOOL_REGISTRY)) {
    throw new Error(`Unknown tool '${name}'. Available: ${Object.keys(TOOL_REGISTRY).join(', ')}`);
  }

  throw new NotImplementedError('Tool implementation arrives in Phase 5B.');
}
