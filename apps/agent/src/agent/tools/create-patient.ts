import { z } from 'zod';
import { patients, consents } from '@dental-pms/db/schema';
import type { ToolSpec } from '../../llm/base';
import { runInClinic, getClinicIdFromContext } from '../../db/context';
import { CONSENT_DEFINITIONS } from '../constants';
import { writeAuditLog } from '../../db/audit';

export const TOOL_NAME = 'create_patient';
export const TOOL_DESCRIPTION = 'Register a new patient record with consent and demographic details.';

export const createPatientInputSchema = z.object({
  full_name: z.string().describe('Full name of the patient'),
  phone: z.string().describe('Patient telephone number in E.164 format'),
  consent_type: z
    .enum(['data_processing', 'marketing', 'reminders'])
    .default('data_processing')
    .describe('Patient consent type'),
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
  input: CreatePatientInput,
  context?: Record<string, unknown>
): Promise<CreatePatientOutput> {
  const clinicId = getClinicIdFromContext(context);

  return await runInClinic(clinicId, async (tx) => {
    // 1. Insert patient row
    const [newPatient] = await tx
      .insert(patients)
      .values({
        clinicId,
        fullName: input.full_name.trim(),
        phone: input.phone.trim(),
        email: input.email && input.email.trim().length > 0 ? input.email.trim() : null,
        dob: input.dob ? input.dob.trim() : null,
        gender: input.gender ? input.gender.trim() : null,
      })
      .returning();

    if (!newPatient) {
      throw new Error('Failed to create patient record');
    }

    // 2. Insert compliance consent row
    const consentDef = CONSENT_DEFINITIONS[input.consent_type];
    const textSnapshot = consentDef
      ? consentDef.fullSnapshotText
      : 'I consent to the collection, processing, and clinical record keeping of my dental and medical health information for diagnosis and treatment. [Version 1.0.0]';

    await tx.insert(consents).values({
      clinicId,
      patientId: newPatient.id,
      type: input.consent_type,
      version: consentDef?.version || '1.0.0',
      grantedAt: new Date(),
      ip: '127.0.0.1',
      textSnapshot,
    });

    // 3. Write immutable audit log
    await writeAuditLog(tx, clinicId, {
      action: 'patient.create',
      entity: 'patient',
      entityId: newPatient.id,
      meta: {
        full_name: input.full_name,
        phone: input.phone,
        consents: [input.consent_type],
      },
    });

    return {
      patient_id: newPatient.id,
      full_name: newPatient.fullName,
      phone: newPatient.phone,
      status: 'created',
    };
  });
}
