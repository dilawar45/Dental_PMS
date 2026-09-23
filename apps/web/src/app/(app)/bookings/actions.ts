'use server';

import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { bookingRequests, appointments, patients, users } from '@dental-pms/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, ne, lt, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

import {
  approveBookingSchema,
  rejectBookingSchema,
  linkPatientSchema,
  type ApproveBookingInput,
  type RejectBookingInput,
  type LinkPatientInput,
} from './schemas';

// ─── Server Actions ──────────────────────────────────────────────────────────

/**
 * Approves a pending booking request, creates a confirmed appointment with dentist overlap checks,
 * and updates the booking request status.
 * Restricted to Owner and Receptionist roles.
 */
export async function approveBookingRequestAction(
  rawInput: ApproveBookingInput
): Promise<ActionResult<{ appointmentId: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = approveBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input data',
    };
  }

  const { bookingRequestId, dentistId, patientId, startAt, endAt } = parsed.data;
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  try {
    const created = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Fetch booking request
        const [request] = await tx
          .select()
          .from(bookingRequests)
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        if (!request) {
          throw new Error('Booking request not found');
        }

        if (request.status !== 'pending') {
          throw new Error(
            `Cannot approve booking request: current status is already '${request.status}'`
          );
        }

        // 2. Resolve patient
        const effectivePatientId = request.patientId || patientId;
        if (!effectivePatientId) {
          throw new Error(
            'Cannot approve booking request without a linked patient record. Please link an existing patient or create a new patient profile first.'
          );
        }

        // Verify patient belongs to this clinic
        const [patientRecord] = await tx
          .select({ id: patients.id, fullName: patients.fullName })
          .from(patients)
          .where(
            and(
              eq(patients.id, effectivePatientId),
              eq(patients.clinicId, user.clinicId)
            )
          );

        if (!patientRecord) {
          throw new Error('Linked patient record not found in this clinic');
        }

        // 3. Verify dentist
        const [dentistRecord] = await tx
          .select({ id: users.id, fullName: users.fullName, role: users.role })
          .from(users)
          .where(and(eq(users.id, dentistId), eq(users.clinicId, user.clinicId)));

        if (!dentistRecord || !['dentist', 'owner'].includes(dentistRecord.role)) {
          throw new Error('Selected practitioner is not an authorized dentist or owner');
        }

        // 4. Overlap check for dentist
        const overlapping = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.clinicId, user.clinicId),
              eq(appointments.dentistId, dentistId),
              ne(appointments.status, 'cancelled'),
              lt(appointments.startAt, endDate),
              gt(appointments.endAt, startDate)
            )
          )
          .limit(1);

        if (overlapping.length > 0) {
          throw new Error(
            `Dentist ${dentistRecord.fullName} already has an appointment scheduled during this time slot.`
          );
        }

        // 5. Insert confirmed appointment
        const [newAppt] = await tx
          .insert(appointments)
          .values({
            clinicId: user.clinicId,
            patientId: effectivePatientId,
            dentistId,
            startAt: startDate,
            endAt: endDate,
            status: 'confirmed',
            reason: request.reason || 'Omnichannel booking request inquiry',
            notes: `Approved from ${request.requestedVia} booking request. ${request.notes || ''}`.trim(),
          })
          .returning();

        if (!newAppt) {
          throw new Error('Failed to create appointment');
        }

        // 6. Update booking request status to approved
        await tx
          .update(bookingRequests)
          .set({
            status: 'approved',
            patientId: effectivePatientId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        // 7. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'booking_request.approve',
          entity: 'booking_request',
          entityId: bookingRequestId,
          meta: {
            appointmentId: newAppt.id,
            patientId: effectivePatientId,
            patientName: patientRecord.fullName,
            dentistId,
            dentistName: dentistRecord.fullName,
            channel: request.requestedVia,
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
          },
        });

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'appointment.create',
          entity: 'appointment',
          entityId: newAppt.id,
          meta: {
            bookingRequestId,
            status: 'confirmed',
            reason: request.reason,
          },
        });

        return newAppt;
      }
    );

    if (!created) {
      throw new Error('Failed to approve booking request');
    }

    // Trigger push notification to patient (non-blocking)
    const agentUrl = process.env['AGENT_SERVICE_URL'] || 'http://localhost:8000';
    const dateFormatted = startDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    const timeFormatted = startDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    fetch(`${agentUrl}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Simulator-Secret': process.env['SIMULATOR_SHARED_SECRET'] || '',
      },
      body: JSON.stringify({
        patient_id: effectivePatientId,
        title: 'Appointment Confirmed',
        body: `Your appointment is confirmed for ${dateFormatted} at ${timeFormatted}.`,
        data: {
          appointment_id: created.id,
          type: 'booking_approved',
        },
      }),
    }).catch((err) =>
      console.error('[PushNotify] Error calling agent /notify on booking approve:', err)
    );

    revalidatePath('/bookings');
    revalidatePath(`/bookings/${bookingRequestId}`);
    revalidatePath('/appointments');
    return { success: true, data: { appointmentId: created.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to approve booking request',
    };
  }
}

/**
 * Rejects a pending booking request with staff justification reason.
 * Restricted to Owner and Receptionist roles.
 */
export async function rejectBookingRequestAction(
  rawInput: RejectBookingInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = rejectBookingSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input data',
    };
  }

  const { bookingRequestId, reason } = parsed.data;

  try {
    let patientIdToNotify: string | null = null;

    await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const [request] = await tx
          .select()
          .from(bookingRequests)
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        if (!request) {
          throw new Error('Booking request not found');
        }

        if (request.status !== 'pending') {
          throw new Error(
            `Cannot reject booking request: current status is already '${request.status}'`
          );
        }

        patientIdToNotify = request.patientId;

        await tx
          .update(bookingRequests)
          .set({
            status: 'rejected',
            notes: reason,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'booking_request.reject',
          entity: 'booking_request',
          entityId: bookingRequestId,
          meta: {
            reason,
            channel: request.requestedVia,
          },
        });
      }
    );

    // Trigger push notification to patient (non-blocking)
    const agentUrl = process.env['AGENT_SERVICE_URL'] || 'http://localhost:8000';
    if (patientIdToNotify) {
      fetch(`${agentUrl}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Simulator-Secret': process.env['SIMULATOR_SHARED_SECRET'] || '',
        },
        body: JSON.stringify({
          patient_id: patientIdToNotify,
          title: 'Booking Update',
          body: "We couldn't confirm your requested slot. Please try again.",
          data: {
            booking_request_id: bookingRequestId,
            type: 'booking_rejected',
          },
        }),
      }).catch((err) =>
        console.error('[PushNotify] Error calling agent /notify on booking reject:', err)
      );
    }

    revalidatePath('/bookings');
    revalidatePath(`/bookings/${bookingRequestId}`);
    return { success: true, data: { id: bookingRequestId } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reject booking request',
    };
  }
}

/**
 * Links an unlinked booking request to an existing patient record.
 * Restricted to Owner and Receptionist roles.
 */
export async function linkBookingPatientAction(
  rawInput: LinkPatientInput
): Promise<ActionResult<{ patientId: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = linkPatientSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input data',
    };
  }

  const { bookingRequestId, patientId } = parsed.data;

  try {
    await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        const [request] = await tx
          .select()
          .from(bookingRequests)
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        if (!request) {
          throw new Error('Booking request not found');
        }

        const [patientRecord] = await tx
          .select({ id: patients.id, fullName: patients.fullName })
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!patientRecord) {
          throw new Error('Patient not found in this clinic');
        }

        await tx
          .update(bookingRequests)
          .set({
            patientId,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(bookingRequests.id, bookingRequestId),
              eq(bookingRequests.clinicId, user.clinicId)
            )
          );

        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'booking_request.link_patient',
          entity: 'booking_request',
          entityId: bookingRequestId,
          meta: {
            patientId,
            patientName: patientRecord.fullName,
          },
        });
      }
    );

    revalidatePath('/bookings');
    revalidatePath(`/bookings/${bookingRequestId}`);
    return { success: true, data: { patientId } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to link patient',
    };
  }
}
