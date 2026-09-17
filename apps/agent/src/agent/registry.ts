/**
 * Central tool registry and execution dispatcher.
 */

import type { ToolSpec } from '../llm/base';
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

export interface ToolExecutionContext {
  clinic_id: string;
  session_id: string;
  channel: string;
  from?: string;
  sender?: string;
  [key: string]: unknown;
}

export type ToolExecutionError = {
  ok: false;
  error: string;
  tool: string;
};

export type ToolExecutionSuccess = {
  ok: true;
  [key: string]: unknown;
};

export type ToolResult = ToolExecutionSuccess | ToolExecutionError;

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>,
  context?: ToolExecutionContext
): Promise<ToolResult> {
  if (!(name in TOOL_REGISTRY)) {
    return {
      ok: false,
      error: `Unknown tool '${name}'. Available: ${Object.keys(TOOL_REGISTRY).join(', ')}`,
      tool: name,
    };
  }

  try {
    switch (name) {
      case lookupPatient.TOOL_NAME: {
        const parsed = lookupPatient.lookupPatientInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await lookupPatient.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case createPatient.TOOL_NAME: {
        const parsed = createPatient.createPatientInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await createPatient.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case getClinicInfo.TOOL_NAME: {
        const parsed = getClinicInfo.getClinicInfoInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await getClinicInfo.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case checkAvailability.TOOL_NAME: {
        const parsed = checkAvailability.checkAvailabilityInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await checkAvailability.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case createBookingRequest.TOOL_NAME: {
        const parsed = createBookingRequest.createBookingRequestInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await createBookingRequest.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case triageSymptoms.TOOL_NAME: {
        const parsed = triageSymptoms.triageSymptomsInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await triageSymptoms.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case requestHumanHandoff.TOOL_NAME: {
        const parsed = requestHumanHandoff.requestHumanHandoffInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await requestHumanHandoff.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      case sendReceipt.TOOL_NAME: {
        const parsed = sendReceipt.sendReceiptInputSchema.safeParse(args);
        if (!parsed.success) {
          return {
            ok: false,
            error: `Input validation failed for ${name}: ${parsed.error.message}`,
            tool: name,
          };
        }
        const result = await sendReceipt.execute(parsed.data, context);
        return { ok: true, ...result };
      }

      default:
        return {
          ok: false,
          error: `Unhandled tool handler for '${name}'`,
          tool: name,
        };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
      tool: name,
    };
  }
}
