import { z } from 'zod';
import { eq, and, isNull } from 'drizzle-orm';
import { patients } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';

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
  input: LookupPatientInput,
  context?: Record<string, unknown>
): Promise<LookupPatientOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    const cleanPhone = input.phone.trim();
    const [patient] = await tx
      .select({
        id: patients.id,
        fullName: patients.fullName,
        phone: patients.phone,
        email: patients.email,
        dob: patients.dob,
        gender: patients.gender,
      })
      .from(patients)
      .where(and(eq(patients.phone, cleanPhone), isNull(patients.deletedAt)))
      .limit(1);

    if (!patient) {
      return { found: false, patient: null };
    }

    return {
      found: true,
      patient: {
        id: patient.id,
        full_name: patient.fullName,
        phone: patient.phone,
        email: patient.email,
        dob: patient.dob,
        gender: patient.gender,
      },
    };
  });
}
