import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, consents } from '@dental-pms/db/schema';
import { signPatientToken } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

// TODO: Implement email verification on registration in future release
// TODO: Add advanced password strength meter calculation

const registerSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  cnic: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be formatted as 13 digits: #####-#######-#'),
  phone: z
    .string()
    .trim()
    .regex(/^\+92\d{10}$/, 'Phone number must follow Pakistani format (+923XXXXXXXXX)'),
  age: z
    .number()
    .int('Age must be an integer')
    .min(1, 'Age must be between 1 and 120')
    .max(120, 'Age must be between 1 and 120'),
  gender: z.enum(['male', 'female', 'other'], {
    message: "Gender must be 'male', 'female', or 'other'",
  }),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email cannot exceed 255 characters'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'Password must contain at least one letter and one number'),
  clinic_id: z.string().uuid('Invalid clinic ID format'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const {
      full_name,
      cnic,
      phone,
      age,
      gender,
      email,
      password,
      clinic_id: clinicId,
    } = parsed.data;

    const normalizedEmail = email.toLowerCase();
    const db = getDefaultDb();

    // Check CNIC and Email uniqueness within clinic
    const conflictResult = await withClinic(db, clinicId, async (tx) => {
      const existingCnic = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.cnic, cnic),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (existingCnic.length > 0) {
        return { conflict: 'cnic' };
      }

      const existingEmail = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            sql`LOWER(${patients.email}) = ${normalizedEmail}`,
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      if (existingEmail.length > 0) {
        return { conflict: 'email' };
      }

      return null;
    });

    if (conflictResult?.conflict === 'cnic') {
      return withCors(
        NextResponse.json(
          { error: 'A patient with this CNIC is already registered' },
          { status: 409 }
        ),
        req
      );
    }

    if (conflictResult?.conflict === 'email') {
      return withCors(
        NextResponse.json(
          { error: 'A patient with this email is already registered' },
          { status: 409 }
        ),
        req
      );
    }

    // Hash password with bcrypt cost 10
    const passwordHash = await bcrypt.hash(password, 10);

    // Compute DOB: today - age years (YYYY-MM-DD)
    const today = new Date();
    const birthYear = today.getFullYear() - age;
    const dobString = `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Perform transaction: insert patient, consent record, and audit log
    const createdPatient = await withClinic(db, clinicId, async (tx) => {
      const [newPatient] = await tx
        .insert(patients)
        .values({
          clinicId,
          fullName: full_name,
          phone,
          email: normalizedEmail,
          dob: dobString,
          gender,
          cnic,
          passwordHash,
          age,
          preferredLanguage: 'en',
          lastLoginAt: new Date(),
        })
        .returning();

      if (!newPatient) {
        throw new Error('Failed to create patient account');
      }

      // Automatically create mandatory data_processing consent record with bilingual text
      await tx.insert(consents).values({
        clinicId,
        patientId: newPatient.id,
        type: 'data_processing',
        version: '1.0',
        textSnapshot:
          'I consent to Bright Smile Dental processing my personal, demographic, and dental health data for appointment management and dental care under Pakistan data privacy regulations. / میں برائٹ سمائل ڈینٹل کو اپنے ذاتی اور دانتوں کے علاج سے متعلق ڈیٹا کو استعمال کرنے کی اجازت دیتا/دیتی ہوں۔',
      });

      // Audit log entry
      await logAudit(tx, {
        clinicId,
        actorId: null,
        action: 'patient.register',
        entity: 'patient',
        entityId: newPatient.id,
        meta: {
          email: normalizedEmail,
          cnic,
          phone,
          age,
          gender,
        },
      });

      return newPatient;
    });

    // Issue 30-day JWT
    const token = signPatientToken(createdPatient.id, clinicId);

    return withCors(
      NextResponse.json({
        token,
        patient: {
          id: createdPatient.id,
          full_name: createdPatient.fullName,
          phone: createdPatient.phone,
          email: createdPatient.email,
        },
      }),
      req
    );
  } catch (error) {
    console.error('Patient registration error:', error);
    return withCors(
      NextResponse.json(
        { error: 'An unexpected error occurred during registration' },
        { status: 500 }
      ),
      req
    );
  }
}
