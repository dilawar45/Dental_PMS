import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql, eq, and, isNull } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients } from '@dental-pms/db/schema';
import { signPatientToken } from '@/lib/patient-auth';
import {
  checkPatientLoginRateLimit,
  recordPatientFailedLogin,
  clearPatientFailedLogin,
} from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

import { or } from 'drizzle-orm';

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Phone number, CNIC, or Email is required')
    .max(35, 'Identifier cannot exceed 35 characters')
    .optional(),
  email: z.string().trim().max(35).optional(),
  phone: z.string().trim().max(18).optional(),
  cnic: z.string().trim().max(20).optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password cannot exceed 72 characters'),
  clinic_id: z.string().uuid('Invalid clinic ID format'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { identifier, email, phone, cnic, password, clinic_id: clinicId } = parsed.data;
    const loginValue = (identifier || phone || cnic || email || '').trim();

    if (!loginValue) {
      return withCors(
        NextResponse.json(
          { error: 'Please enter your phone number, CNIC, or email address' },
          { status: 400 }
        ),
        req
      );
    }

    const normalizedLogin = loginValue.toLowerCase();
    const normalizedEmail = (email || loginValue).toLowerCase();

    // Rate limiting: 5 failed attempts per identifier per 15 min
    const rateCheck = await checkPatientLoginRateLimit(normalizedLogin);
    if (!rateCheck.allowed) {
      return withCors(
        NextResponse.json(
          {
            error: 'Too many failed login attempts. Please wait before trying again.',
            reset_seconds: rateCheck.resetSeconds,
          },
          { status: 429 }
        ),
        req
      );
    }

    const db = getDefaultDb();

    // Look up patient by email, phone, or CNIC within clinic scope
    const patientRow = await withClinic(db, clinicId, async (tx) => {
      const [p] = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          cnic: patients.cnic,
          passwordHash: patients.passwordHash,
        })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            isNull(patients.deletedAt),
            or(
              eq(patients.phone, loginValue),
              eq(patients.cnic, loginValue),
              sql`LOWER(${patients.email}) = ${normalizedLogin}`
            )
          )
        )
        .limit(1);

      return p || null;
    });

    // Anti-enumeration: Generic error if patient doesn't exist or has no password set
    if (!patientRow || !patientRow.passwordHash) {
      recordPatientFailedLogin(normalizedEmail);
      return withCors(
        NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        ),
        req
      );
    }

    // Compare bcrypt password
    const isPasswordValid = await bcrypt.compare(password, patientRow.passwordHash);
    if (!isPasswordValid) {
      recordPatientFailedLogin(normalizedEmail);
      return withCors(
        NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        ),
        req
      );
    }

    // Login successful: clear failed attempts
    clearPatientFailedLogin(normalizedEmail);

    // Update lastLoginAt and write audit log
    await withClinic(db, clinicId, async (tx) => {
      await tx
        .update(patients)
        .set({ lastLoginAt: new Date() })
        .where(eq(patients.id, patientRow.id));

      await logAudit(tx, {
        clinicId,
        actorId: null,
        action: 'patient.login',
        entity: 'patient',
        entityId: patientRow.id,
        meta: {
          email: normalizedEmail,
        },
      });
    });

    // Issue JWT
    const token = signPatientToken(patientRow.id, clinicId);

    return withCors(
      NextResponse.json({
        token,
        patient: {
          id: patientRow.id,
          full_name: patientRow.fullName,
          phone: patientRow.phone,
          email: patientRow.email,
        },
      }),
      req
    );
  } catch (error) {
    console.error('Patient login error:', error);
    return withCors(
      NextResponse.json(
        { error: 'An unexpected error occurred during login' },
        { status: 500 }
      ),
      req
    );
  }
}
