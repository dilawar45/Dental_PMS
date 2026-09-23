import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { eq, and, isNull } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, patientPasswordResets } from '@dental-pms/db/schema';
import { checkPatientForgotPasswordRateLimit } from '@/lib/rate-limit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

// TODO: Deliver password reset link/token via real SMS OTP in production

const forgotPasswordSchema = z.object({
  cnic: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be formatted as 13 digits: #####-#######-#'),
  phone: z
    .string()
    .trim()
    .regex(/^\+92\d{10}$/, 'Phone number must follow Pakistani format (+923XXXXXXXXX)'),
  clinic_id: z.string().uuid('Invalid clinic ID format'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { cnic, phone, clinic_id: clinicId } = parsed.data;

    // Rate limiting: 3 requests per CNIC per hour
    const rateCheck = await checkPatientForgotPasswordRateLimit(cnic);
    if (!rateCheck.allowed) {
      return withCors(
        NextResponse.json(
          {
            error: 'Too many password reset requests. Please wait before trying again.',
            reset_seconds: rateCheck.resetSeconds,
          },
          { status: 429 }
        ),
        req
      );
    }

    const db = getDefaultDb();

    // Look up patient by cnic AND phone within clinic scope
    const patientRow = await withClinic(db, clinicId, async (tx) => {
      const [p] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, clinicId),
            eq(patients.cnic, cnic),
            eq(patients.phone, phone),
            isNull(patients.deletedAt)
          )
        )
        .limit(1);

      return p || null;
    });

    // Anti-enumeration: Always return success even if no patient matched
    if (!patientRow) {
      return withCors(
        NextResponse.json({ success: true }),
        req
      );
    }

    // Generate random 32-byte hex token and store SHA-256 hash in DB with 30-min TTL
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Extract client IP if present
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() || null : null;

    await withClinic(db, clinicId, async (tx) => {
      await tx.insert(patientPasswordResets).values({
        patientId: patientRow.id,
        clinicId,
        tokenHash,
        expiresAt,
        ip,
      });
    });

    // Anti-enumeration: Never return the token in the response
    return withCors(
      NextResponse.json({ success: true }),
      req
    );
  } catch (error) {
    console.error('Patient forgot-password error:', error);
    return withCors(
      NextResponse.json(
        { error: 'An unexpected error occurred' },
        { status: 500 }
      ),
      req
    );
  }
}
