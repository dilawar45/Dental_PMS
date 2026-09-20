import { NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDefaultDb, withClinic } from '@dental-pms/db';
import { patients, devOutbox } from '@dental-pms/db/schema';
import { requirePatient, PatientAuthError } from '@/lib/patient-auth';
import { checkPatientChatRateLimit } from '@/lib/rate-limit';
import { withCors, handleCorsPreflight } from '@/lib/cors';

const chatSchema = z.object({
  body: z.string().trim().min(1, 'Message body cannot be empty'),
});

export async function OPTIONS(req: Request) {
  return handleCorsPreflight(req);
}

export async function POST(req: Request) {
  try {
    const auth = requirePatient(req);
    const body = await req.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return withCors(
        NextResponse.json(
          { error: 'Invalid input', details: parsed.error.issues },
          { status: 400 }
        ),
        req
      );
    }

    // Rate limiting: 30 messages per patient per hour
    const rateCheck = await checkPatientChatRateLimit(auth.patient_id);
    if (!rateCheck.allowed) {
      return withCors(
        NextResponse.json(
          {
            error: 'Too many messages sent. Please wait before continuing your conversation.',
            reset_seconds: rateCheck.resetSeconds,
          },
          { status: 429 }
        ),
        req
      );
    }

    const db = getDefaultDb();

    // Look up patient phone
    const patientRecord = await withClinic(auth.clinic_id, async (tx) => {
      const [p] = await tx
        .select({ id: patients.id, phone: patients.phone })
        .from(patients)
        .where(eq(patients.id, auth.patient_id))
        .limit(1);
      return p;
    });

    if (!patientRecord) {
      return withCors(
        NextResponse.json({ error: 'Patient not found' }, { status: 404 }),
        req
      );
    }

    const agentServiceUrl = process.env['AGENT_SERVICE_URL'] || 'http://localhost:8000';
    const sharedSecret = process.env['SIMULATOR_SHARED_SECRET'];

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sharedSecret) {
      headers['X-Simulator-Secret'] = sharedSecret;
    }

    let reply = 'Thank you for reaching out to Bright Smile Dental. An assistant will get back to you shortly.';
    let toolIntents: string[] = [];

    try {
      const agentRes = await fetch(`${agentServiceUrl}/simulate-inbound`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          channel: 'patient_app',
          from: patientRecord.phone,
          body: parsed.data.body,
          clinic_id: auth.clinic_id,
        }),
      });

      if (agentRes.ok) {
        const agentData = (await agentRes.json()) as {
          reply?: string;
          tool_intents?: string[];
          tool_intent?: string;
        };
        reply = agentData.reply || reply;
        toolIntents =
          agentData.tool_intents || (agentData.tool_intent ? [agentData.tool_intent] : []);
      }
    } catch {
      // Fallback response when agent service is offline
      reply = `Hello! I received your message: "${parsed.data.body}". How can I assist with your dental appointment today?`;
    }

    // Log inbound + outbound turns to dev_outbox with channel 'patient_app'
    try {
      await db.insert(devOutbox).values([
        {
          channel: 'patient_app',
          from: patientRecord.phone,
          to: 'agent',
          body: parsed.data.body,
          provider: 'patient_app',
          direction: 'inbound',
        },
        {
          channel: 'patient_app',
          from: 'agent',
          to: patientRecord.phone,
          body: reply,
          provider: 'patient_app',
          direction: 'outbound',
        },
      ]);
    } catch {
      // Non-blocking log failure
    }

    return withCors(
      NextResponse.json({
        reply,
        tool_intents: toolIntents,
      }),
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
