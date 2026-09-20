import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { and, eq, isNull, gt, desc } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, patientOtps } from '@dental-pms/db/schema';
import { signPatientToken } from '@/lib/patient-auth';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const verifyOtpSchema = z.object({
  phone: z.string().trim(),
  code: z.string().trim().length(6, 'Verification code must be 6 digits'),
  clinic_id: z.string().uuid('Invalid clinic ID format'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = verifyOtpSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { phone, code, clinic_id } = parsed.data;
    const db = getDefaultDb();

    // Look up most recent unconsumed, unexpired OTP for this phone
    const [latestOtp] = await db
      .select()
      .from(patientOtps)
      .where(
        and(
          eq(patientOtps.phone, phone),
          isNull(patientOtps.consumedAt),
          gt(patientOtps.expiresAt, new Date())
        )
      )
      .orderBy(desc(patientOtps.createdAt))
      .limit(1);

    if (!latestOtp) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 401 }
        ),
        req
      );
    }

    // Increment attempts
    const newAttempts = latestOtp.attempts + 1;
    await db
      .update(patientOtps)
      .set({ attempts: newAttempts })
      .where(eq(patientOtps.id, latestOtp.id));

    if (newAttempts > 5) {
      // Invalidate on >5 attempts
      await db
        .update(patientOtps)
        .set({ consumedAt: new Date() })
        .where(eq(patientOtps.id, latestOtp.id));

      return withCors(
        NextResponse.json(
          { error: 'Too many failed verification attempts. Please request a new code.' },
          { status: 401 }
        ),
        req
      );
    }

    // Verify hash
    const inputHash = crypto.createHash('sha256').update(code).digest('hex');
    if (inputHash !== latestOtp.codeHash) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid or expired verification code' },
          { status: 401 }
        ),
        req
      );
    }

    // Code matched! Mark consumed
    await db
      .update(patientOtps)
      .set({ consumedAt: new Date() })
      .where(eq(patientOtps.id, latestOtp.id));

    // Look up patient within target clinic and update last_login_at
    const patient = await withClinic(clinic_id, async (tx) => {
      const [p] = await tx
        .select({
          id: patients.id,
          fullName: patients.fullName,
          phone: patients.phone,
        })
        .from(patients)
        .where(eq(patients.phone, phone))
        .limit(1);

      if (p) {
        await tx
          .update(patients)
          .set({ lastLoginAt: new Date() })
          .where(eq(patients.id, p.id));
      }

      return p;
    });

    if (!patient) {
      return withCors(
        NextResponse.json(
          { error: 'Patient account not registered in this clinic' },
          { status: 401 }
        ),
        req
      );
    }

    // Sign 30-day JWT
    const token = signPatientToken(patient.id, clinic_id);

    return withCors(
      NextResponse.json({
        token,
        patient: {
          id: patient.id,
          full_name: patient.fullName,
          phone: patient.phone,
        },
      }),
      req
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
