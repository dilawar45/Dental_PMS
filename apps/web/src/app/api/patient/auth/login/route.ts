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

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
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

    const { email, password, clinic_id: clinicId } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    // Rate limiting: 5 failed attempts per email per 15 min
    const rateCheck = await checkPatientLoginRateLimit(normalizedEmail);
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

    // Look up patient by email within clinic scope
    const patientRow = await withClinic(db, clinicId, async (tx) => {
      const [p] = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
          email: patients.email,
          passwordHash: patients.passwordHash,
        })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            sql`LOWER(${patients.email}) = ${normalizedEmail}`,
            isNull(patients.deletedAt)
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
