import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { patients } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function GET(req: Request) {
  try {
    const auth = requirePatient(req);

    const profile = await withClinic(auth.clinic_id, async (tx) => {
      const [p] = await tx
        .select({
          id: patients.id,
          full_name: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          dob: patients.dob,
          gender: patients.gender,
          address: patients.address,
          preferred_language: patients.preferredLanguage,
          clinic_id: patients.clinicId,
        })
        .from(patients)
        .where(eq(patients.id, auth.patient_id))
        .limit(1);

      return p;
    });

    if (!profile) {
      return withCors(
        NextResponse.json({ error: 'Patient not found' }, { status: 404 }),
        req
      );
    }

    return withCors(NextResponse.json(profile), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}

const updateProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(25, 'Full name cannot exceed 25 characters')
    .optional(),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(25, 'Email cannot exceed 25 characters')
    .optional()
    .nullable(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{10,15}$/, 'Phone number must be digits only (10 to 15 digits)')
    .optional(),
  cnic: z
    .string()
    .trim()
    .min(13, 'CNIC must be at least 13 digits')
    .max(20, 'CNIC cannot exceed 20 digits')
    .regex(/^[0-9-]+$/, 'CNIC must contain only digits and hyphens')
    .optional(),
  age: z
    .number()
    .int('Age must be an integer')
    .min(1, 'Age must be between 1 and 100')
    .max(100, 'Age must be between 1 and 100')
    .optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z
    .string()
    .trim()
    .max(100, 'Address cannot exceed 100 characters')
    .optional()
    .nullable(),
  preferred_language: z.string().trim().min(2).max(10).optional(),
});

export async function PATCH(req: Request) {
  try {
    const auth = requirePatient(req);
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const updates: Partial<{
      fullName: string;
      email: string | null;
      phone: string;
      cnic: string;
      age: number;
      dob: string;
      gender: 'male' | 'female' | 'other';
      address: string | null;
      preferredLanguage: string;
    }> = {};

    if (parsed.data.full_name !== undefined) updates.fullName = parsed.data.full_name;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email ? parsed.data.email.toLowerCase().trim() : null;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.cnic !== undefined) updates.cnic = parsed.data.cnic;
    if (parsed.data.gender !== undefined) updates.gender = parsed.data.gender;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.preferred_language !== undefined) {
      updates.preferredLanguage = parsed.data.preferred_language;
    }
    if (parsed.data.age !== undefined) {
      updates.age = parsed.data.age;
      const today = new Date();
      const birthYear = today.getFullYear() - parsed.data.age;
      updates.dob = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

    if (Object.keys(updates).length === 0) {
      return withCors(
        NextResponse.json({ error: 'No fields provided for update' }, { status: 400 }),
        req
      );
    }

    const updated = await withClinic(auth.clinic_id, async (tx) => {
      const [res] = await tx
        .update(patients)
        .set(updates)
        .where(eq(patients.id, auth.patient_id))
        .returning({
          id: patients.id,
          full_name: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          cnic: patients.cnic,
          age: patients.age,
          dob: patients.dob,
          gender: patients.gender,
          address: patients.address,
          preferred_language: patients.preferredLanguage,
          clinic_id: patients.clinicId,
        });

      if (res) {
        await logAudit(tx, {
          clinicId: auth.clinic_id,
          actorId: null,
          action: 'patient.update',
          entity: 'patient',
          entityId: auth.patient_id,
          meta: {
            actor_type: 'patient',
            patient_id: auth.patient_id,
            updated_fields: Object.keys(updates),
          },
        });
      }

      return res;
    });

    if (!updated) {
      return withCors(
        NextResponse.json({ error: 'Patient not found' }, { status: 404 }),
        req
      );
    }

    return withCors(NextResponse.json(updated), req);
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
