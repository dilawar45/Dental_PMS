'use server';

import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import {
  simulatorSessions,
  auditLog,
  bookingRequests,
  handoffs,
} from '@dental-pms/db/schema';
import { eq, and, desc, gte } from 'drizzle-orm';
import { z } from 'zod';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const createSessionSchema = z.object({
  channel: z.enum(['whatsapp', 'voice', 'instagram', 'facebook', 'google']).default('whatsapp'),
  phone: z.string().min(5, 'Phone number required'),
  label: z.string().optional(),
});

export interface AgentInboundReply {
  reply: string;
  tool_intent: string | null;
  session_id: string;
  channel: string;
  logged: boolean;
  tool_intents: string[];
}

export interface SideEffectsData {
  auditLogs: Array<{
    id: string;
    action: string;
    entity: string;
    entityId: string | null;
    meta: unknown;
    createdAt: Date;
  }>;
  bookingRequests: Array<{
    id: string;
    patientName: string | null;
    patientPhone: string | null;
    reason: string | null;
    status: string;
    requestedVia: string;
    createdAt: Date;
  }>;
  handoffs: Array<{
    id: string;
    reason: string;
    urgency: string;
    createdAt: Date;
  }>;
}

/**
 * Creates a new simulator session record.
 */
export async function createSimulatorSessionAction(rawInput: {
  channel?: string;
  phone: string;
  label?: string;
}): Promise<ActionResult<{
  id: string;
  channel: string;
  phone: string;
  label: string | null;
  createdAt: Date;
}>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = createSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid session parameters',
    };
  }

  try {
    const session = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      const [inserted] = await tx
        .insert(simulatorSessions)
        .values({
          clinicId: user.clinicId,
          startedBy: user.id,
          channel: parsed.data.channel,
          phone: parsed.data.phone,
          label: parsed.data.label || `${parsed.data.channel.toUpperCase()} Demo - ${parsed.data.phone}`,
        })
        .returning();

      return inserted;
    });

    if (!session) {
      return { success: false, error: 'Failed to create simulator session' };
    }

    return {
      success: true,
      data: {
        id: session.id,
        channel: session.channel,
        phone: session.phone,
        label: session.label,
        createdAt: session.createdAt,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Database error';
    return { success: false, error: message };
  }
}

/**
 * Proxies an inbound simulated patient message to the agent service.
 */
export async function sendSimulatorMessageAction(input: {
  sessionId: string;
  body: string;
  channel: string;
  phone: string;
}): Promise<ActionResult<AgentInboundReply>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  if (!input.body || input.body.trim().length === 0) {
    return { success: false, error: 'Message cannot be empty' };
  }

  const agentServiceUrl = process.env['AGENT_SERVICE_URL'] || 'http://localhost:8000';
  const sharedSecret = process.env['SIMULATOR_SHARED_SECRET'];

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (sharedSecret) {
      headers['X-Simulator-Secret'] = sharedSecret;
    }

    const res = await fetch(`${agentServiceUrl}/simulate-inbound`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        channel: input.channel,
        from: input.phone,
        body: input.body,
        clinic_id: user.clinicId,
      }),
    });

    if (!res.ok) {
      let errorDetail = `Agent returned status ${res.status}`;
      try {
        const errorJson = (await res.json()) as { error?: string; message?: string };
        if (errorJson.error || errorJson.message) {
          errorDetail = errorJson.error || errorJson.message || errorDetail;
        }
      } catch {
        // use fallback status
      }
      return { success: false, error: errorDetail };
    }

    const data = (await res.json()) as AgentInboundReply;

    // Touch the session record updated_at
    try {
      await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
        await tx
          .update(simulatorSessions)
          .set({ updatedAt: new Date() })
          .where(
            and(
              eq(simulatorSessions.id, input.sessionId),
              eq(simulatorSessions.clinicId, user.clinicId)
            )
          );
      });
    } catch {
      // Non-blocking if session update fails
    }

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to reach agent service';
    return { success: false, error: `Connection error: ${message}` };
  }
}

/**
 * Retrieves recently generated side effects (audit log, booking requests, handoffs)
 * for the current clinic within the last specified seconds or timestamp.
 */
export async function getSimulatorSideEffectsAction(
  sinceIso?: string
): Promise<ActionResult<SideEffectsData>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const sinceDate = sinceIso
    ? new Date(sinceIso)
    : new Date(Date.now() - 15 * 1000); // 15 seconds window

  try {
    const sideEffects = await withClinic(db, user.clinicId, async (tx: ClinicTransaction) => {
      // 1. Audit logs
      const logs = await tx
        .select({
          id: auditLog.id,
          action: auditLog.action,
          entity: auditLog.entity,
          entityId: auditLog.entityId,
          meta: auditLog.meta,
          createdAt: auditLog.createdAt,
        })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.clinicId, user.clinicId),
            gte(auditLog.createdAt, sinceDate)
          )
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(10);

      // 2. Booking requests
      const bookings = await tx
        .select({
          id: bookingRequests.id,
          patientName: bookingRequests.patientName,
          patientPhone: bookingRequests.patientPhone,
          reason: bookingRequests.reason,
          status: bookingRequests.status,
          requestedVia: bookingRequests.requestedVia,
          createdAt: bookingRequests.createdAt,
        })
        .from(bookingRequests)
        .where(
          and(
            eq(bookingRequests.clinicId, user.clinicId),
            gte(bookingRequests.createdAt, sinceDate)
          )
        )
        .orderBy(desc(bookingRequests.createdAt))
        .limit(10);

      // 3. Handoffs
      const recentHandoffs = await tx
        .select({
          id: handoffs.id,
          reason: handoffs.reason,
          urgency: handoffs.urgency,
          createdAt: handoffs.createdAt,
        })
        .from(handoffs)
        .where(
          and(
            eq(handoffs.clinicId, user.clinicId),
            gte(handoffs.createdAt, sinceDate)
          )
        )
        .orderBy(desc(handoffs.createdAt))
        .limit(10);

      return {
        auditLogs: logs,
        bookingRequests: bookings,
        handoffs: recentHandoffs,
      };
    });

    return { success: true, data: sideEffects };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to query side effects';
    return { success: false, error: message };
  }
}
