import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { withClinic } from '@dental-pms/db';
import { patientDevices, patients } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { logAudit } from '@/lib/audit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const registerDeviceSchema = z.object({
  fcm_token: z.string().trim().min(1, 'fcm_token is required'),
  platform: z.enum(['android', 'ios']),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const auth = requirePatient(req);
    const body = await req.json();
    const parsed = registerDeviceSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    const { fcm_token, platform } = parsed.data;

    const device = await withClinic(auth.clinic_id, async (tx) => {
      const [upserted] = await tx
        .insert(patientDevices)
        .values({
          clinicId: auth.clinic_id,
          patientId: auth.patient_id,
          fcmToken: fcm_token,
          platform,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [patientDevices.patientId, patientDevices.fcmToken],
          set: {
            platform,
            lastSeenAt: new Date(),
          },
        })
        .returning();

      // Update convenience expo_push_token on patient row
      await tx
        .update(patients)
        .set({ expoPushToken: fcm_token })
        .where(eq(patients.id, auth.patient_id));

      if (upserted) {
        await logAudit(tx, {
          clinicId: auth.clinic_id,
          actorId: null,
          action: 'patient.update',
          entity: 'patient',
          entityId: auth.patient_id,
          meta: {
            actor_type: 'patient',
            patient_id: auth.patient_id,
            action: 'device_registered',
            platform,
          },
        });
      }

      return upserted;
    });

    if (!device) {
      return withCors(
        NextResponse.json({ error: 'Failed to register device' }, { status: 500 }),
        req
      );
    }

    return withCors(
      NextResponse.json(
        {
          success: true,
          device: {
            id: device.id,
            platform: device.platform,
            last_seen_at: device.lastSeenAt,
          },
        },
        { status: 201 }
      ),
      req
    );
  } catch (err: unknown) {
    if (err instanceof PatientAuthError) {
      return withCors(NextResponse.json({ error: err.message }, { status: 401 }), req);
    }
    const message = err instanceof Error ? err.message : 'Internal server error';
    return withCors(NextResponse.json({ error: message }, { status: 500 }), req);
  }
}
