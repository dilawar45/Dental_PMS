import { NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { eq, and, isNull, gt, desc, ne } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, patientPasswordResets } from '@dental-pms/db/schema';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const resetPasswordSchema = z.object({
  cnic: z
    .string()
    .trim()
    .regex(/^\d{5}-\d{7}-\d$/, 'CNIC must be formatted as 13 digits: #####-#######-#'),
  phone: z
    .string()
    .trim()
    .regex(/^\+92\d{10}$/, 'Phone number must follow Pakistani format (+923XXXXXXXXX)'),
  new_password: z
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
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { cnic, phone, new_password: newPassword, clinic_id: clinicId } = parsed.data;
    const db = getDefaultDb();

    // Look up patient by cnic + phone within clinic scope
    const patientRow = await withClinic(db, clinicId, async (tx) => {
      const [p] = await tx
        .select({ id: patients.id, email: patients.email })
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

    if (!patientRow) {
      return withCors(
        NextResponse.json(
          { error: 'Verification required. Please restart the forgot-password process.' },
          { status: 401 }
        ),
        req
      );
    }

    // Find most recent unexpired and unconsumed reset token for this patient
    const now = new Date();
    const validReset = await withClinic(db, clinicId, async (tx) => {
      const [resetRecord] = await tx
        .select({ id: patientPasswordResets.id })
        .from(patientPasswordResets)
        .where(
          and(
            eq(patientPasswordResets.patientId, patientRow.id),
            eq(patientPasswordResets.clinicId, clinicId),
            isNull(patientPasswordResets.consumedAt),
            gt(patientPasswordResets.expiresAt, now)
          )
        )
        .orderBy(desc(patientPasswordResets.createdAt))
        .limit(1);

      return resetRecord || null;
    });

    if (!validReset) {
      return withCors(
        NextResponse.json(
          { error: 'Verification required. Please restart the forgot-password process.' },
          { status: 401 }
        ),
        req
      );
    }

    // Hash the new password with bcrypt cost 10
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Consume the token, clean up other unconsumed tokens, update password, and write audit log
    await withClinic(db, clinicId, async (tx) => {
      // Mark current token consumed
      await tx
        .update(patientPasswordResets)
        .set({ consumedAt: new Date() })
        .where(eq(patientPasswordResets.id, validReset.id));

      // Addition 2: Cleanup on reset — delete all other unconsumed tokens for this patient
      // TODO: nightly cleanup job for expired tokens
      await tx
        .delete(patientPasswordResets)
        .where(
          and(
            eq(patientPasswordResets.patientId, patientRow.id),
            isNull(patientPasswordResets.consumedAt),
            ne(patientPasswordResets.id, validReset.id)
          )
        );

      // Update patient password hash
      await tx
        .update(patients)
        .set({
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patientRow.id));

      // Audit log entry
      await logAudit(tx, {
        clinicId,
        actorId: null,
        action: 'patient.password_reset',
        entity: 'patient',
        entityId: patientRow.id,
        meta: {
          cnic,
          phone,
          reset_id: validReset.id,
        },
      });
    });

    return withCors(
      NextResponse.json({ success: true }),
      req
    );
  } catch (error) {
    console.error('Patient password reset error:', error);
    return withCors(
      NextResponse.json(
        { error: 'An unexpected error occurred during password reset' },
        { status: 500 }
      ),
      req
    );
  }
}
