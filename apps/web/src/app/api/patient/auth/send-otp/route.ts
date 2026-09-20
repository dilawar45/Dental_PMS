import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, patientOtps } from '@dental-pms/db/schema';
import { getSmsProvider } from '@dental-pms/integrations';
import { checkSendOtpRateLimit } from '@/lib/rate-limit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const sendOtpSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+92[0-9]{10}$/, 'Phone number must follow Pakistani format (+923XXXXXXXXX)'),
  clinic_id: z.string().uuid('Invalid clinic ID format'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = sendOtpSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { phone, clinic_id } = parsed.data;

    // Rate limiting: max 3 requests per phone per 15 minutes
    const rateCheck = await checkSendOtpRateLimit(phone);
    if (!rateCheck.allowed) {
      return withCors(
        NextResponse.json(
          {
            error: 'Too many OTP requests. Please wait before trying again.',
            reset_seconds: rateCheck.resetSeconds,
          },
          { status: 429 }
        ),
        req
      );
    }

    const db = getDefaultDb();

    // Anti-enumeration check: query patient within clinic scope
    const existingPatient = await withClinic(clinic_id, async (tx) => {
      const [p] = await tx
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.phone, phone))
        .limit(1);
      return p;
    });

    const isDev =
      process.env['OTP_PROVIDER'] === 'mock' ||
      process.env.NODE_ENV !== 'production';

    // If patient does not exist, return generic success without revealing existence
    if (!existingPatient) {
      return withCors(
        NextResponse.json({
          success: true,
          ...(isDev ? { dev_code: '123456' } : {}),
        }),
        req
      );
    }

    // Generate 6-digit code and SHA-256 hash
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL

    // Extract client IP address if available
    const ipHeader =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      null;

    await db.insert(patientOtps).values({
      phone,
      codeHash,
      expiresAt,
      attempts: 0,
      ip: ipHeader,
    });

    // Send SMS via active provider
    const sms = getSmsProvider(db);
    await sms.send(
      phone,
      `Your Bright Smile verification code is ${code}. Valid for 5 minutes. Do not share this code.`
    );

    return withCors(
      NextResponse.json({
        success: true,
        ...(isDev ? { dev_code: code } : {}),
      }),
      req
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
