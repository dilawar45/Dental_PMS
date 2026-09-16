'use server';

import { requireRole } from '@/lib/auth/current-user';
import { db } from '@/lib/db';
import { withClinic, type ClinicTransaction } from '@dental-pms/db';
import { appointments, patients, users } from '@dental-pms/db/schema';
import { logAudit } from '@/lib/audit';
import { eq, and, ne, lt, gt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { AppointmentStatus } from '@dental-pms/types';

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

import {
  createAppointmentSchema,
  updateAppointmentSchema,
  changeStatusSchema,
  isAllowedTransition,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
  type ChangeStatusInput,
} from './schemas';

// ─── Server Actions ──────────────────────────────────────────────────────────

/**
 * Creates a new appointment with dentist overlap validation and audit logging.
 * Restricted to Owner and Receptionist roles.
 */
export async function createAppointmentAction(
  rawInput: CreateAppointmentInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = createAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input data',
    };
  }

  const { patientId, dentistId, startAt, endAt, reason, notes } = parsed.data;
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  try {
    const createdAppointment = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Verify patient belongs to this clinic
        const [patientRecord] = await tx
          .select({ id: patients.id, fullName: patients.fullName })
          .from(patients)
          .where(and(eq(patients.id, patientId), eq(patients.clinicId, user.clinicId)));

        if (!patientRecord) {
          throw new Error('Patient not found in this clinic');
        }

        // 2. Verify dentist belongs to this clinic and has practitioner role
        const [dentistRecord] = await tx
          .select({ id: users.id, fullName: users.fullName, role: users.role })
          .from(users)
          .where(and(eq(users.id, dentistId), eq(users.clinicId, user.clinicId)));

        if (!dentistRecord || !['dentist', 'owner'].includes(dentistRecord.role)) {
          throw new Error('Selected practitioner is not an authorized dentist or owner in this clinic');
        }

        // 3. Overlap check for dentist (same dentist, overlapping time, non-cancelled)
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
            `Dentist ${dentistRecord.fullName} already has a conflicting appointment scheduled during this time slot.`
          );
        }

        // 4. Insert appointment row
        const [newAppt] = await tx
          .insert(appointments)
          .values({
            clinicId: user.clinicId,
            patientId,
            dentistId,
            startAt: startDate,
            endAt: endDate,
            status: 'scheduled',
            reason,
            notes: notes || null,
          })
          .returning();

        if (!newAppt) {
          throw new Error('Failed to create appointment record');
        }

        // 5. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'appointment.create',
          entity: 'appointment',
          entityId: newAppt.id,
          meta: {
            patientId,
            patientName: patientRecord.fullName,
            dentistId,
            dentistName: dentistRecord.fullName,
            startAt: startDate.toISOString(),
            endAt: endDate.toISOString(),
            reason,
          },
        });

        return newAppt;
      }
    );

    revalidatePath('/appointments');
    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: { id: createdAppointment.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create appointment',
    };
  }
}

/**
 * Updates an existing appointment (reschedule / modify notes/practitioner).
 * Restricted to Owner and Receptionist roles.
 * Only allowed for appointments with status 'scheduled' or 'confirmed'.
 */
export async function updateAppointmentAction(
  rawInput: UpdateAppointmentInput
): Promise<ActionResult<{ id: string }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = updateAppointmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input data',
    };
  }

  const { appointmentId, patientId, dentistId, startAt, endAt, reason, notes } = parsed.data;
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);

  try {
    const updated = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Fetch current appointment
        const [current] = await tx
          .select()
          .from(appointments)
          .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, user.clinicId)));

        if (!current) {
          throw new Error('Appointment not found');
        }

        // 2. Validate current status allows editing
        if (!['scheduled', 'confirmed'].includes(current.status)) {
          throw new Error(
            `Cannot edit appointment with terminal or active status '${current.status}'. Only scheduled or confirmed appointments can be edited or rescheduled.`
          );
        }

        // 3. Verify dentist belongs to this clinic
        const [dentistRecord] = await tx
          .select({ id: users.id, fullName: users.fullName, role: users.role })
          .from(users)
          .where(and(eq(users.id, dentistId), eq(users.clinicId, user.clinicId)));

        if (!dentistRecord || !['dentist', 'owner'].includes(dentistRecord.role)) {
          throw new Error('Selected practitioner is not an authorized dentist or owner in this clinic');
        }

        // 4. Overlap check excluding current appointment
        const overlapping = await tx
          .select({ id: appointments.id })
          .from(appointments)
          .where(
            and(
              eq(appointments.clinicId, user.clinicId),
              eq(appointments.dentistId, dentistId),
              ne(appointments.id, appointmentId),
              ne(appointments.status, 'cancelled'),
              lt(appointments.startAt, endDate),
              gt(appointments.endAt, startDate)
            )
          )
          .limit(1);

        if (overlapping.length > 0) {
          throw new Error(
            `Dentist ${dentistRecord.fullName} already has a conflicting appointment scheduled during this time slot.`
          );
        }

        // 5. Diff for audit logging
        const diff: Record<string, { before: unknown; after: unknown }> = {};
        if (current.dentistId !== dentistId) {
          diff.dentistId = { before: current.dentistId, after: dentistId };
        }
        if (current.startAt.toISOString() !== startDate.toISOString()) {
          diff.startAt = { before: current.startAt.toISOString(), after: startDate.toISOString() };
        }
        if (current.endAt.toISOString() !== endDate.toISOString()) {
          diff.endAt = { before: current.endAt.toISOString(), after: endDate.toISOString() };
        }
        if (current.reason !== reason) {
          diff.reason = { before: current.reason, after: reason };
        }
        if ((current.notes || '') !== (notes || '')) {
          diff.notes = { before: current.notes, after: notes };
        }

        // 6. Update appointment
        const [res] = await tx
          .update(appointments)
          .set({
            patientId,
            dentistId,
            startAt: startDate,
            endAt: endDate,
            reason,
            notes: notes || null,
            updatedAt: new Date(),
          })
          .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, user.clinicId)))
          .returning();

        if (!res) {
          throw new Error('Failed to update appointment record');
        }

        // 7. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'appointment.update',
          entity: 'appointment',
          entityId: appointmentId,
          meta: {
            diff,
          },
        });

        return res;
      }
    );

    if (!updated) {
      throw new Error('Failed to update appointment');
    }

    revalidatePath('/appointments');
    revalidatePath(`/appointments/${appointmentId}`);
    revalidatePath(`/patients/${patientId}`);
    return { success: true, data: { id: updated.id } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update appointment',
    };
  }
}

/**
 * Transitions appointment status following strict lifecycle rules:
 * - scheduled -> confirmed | cancelled
 * - confirmed -> arrived | no_show | cancelled
 * - arrived -> completed | cancelled
 * - completed, no_show, cancelled -> terminal
 *
 * Restricted to Owner and Receptionist roles.
 */
export async function changeAppointmentStatusAction(
  rawInput: ChangeStatusInput
): Promise<ActionResult<{ id: string; status: AppointmentStatus }>> {
  const { user } = await requireRole(['owner', 'receptionist']);

  const parsed = changeStatusSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid status payload',
    };
  }

  const { appointmentId, targetStatus } = parsed.data;

  try {
    const updated = await withClinic(
      db,
      user.clinicId,
      async (tx: ClinicTransaction) => {
        // 1. Fetch current appointment
        const [current] = await tx
          .select()
          .from(appointments)
          .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, user.clinicId)));

        if (!current) {
          throw new Error('Appointment not found');
        }

        const currentStatus = current.status as AppointmentStatus;

        // 2. Reject no-op
        if (currentStatus === targetStatus) {
          return current;
        }

        // 3. Enforce lifecycle transition rules
        if (!isAllowedTransition(currentStatus, targetStatus)) {
          throw new Error(
            `Illegal status transition: Cannot change appointment status from '${currentStatus}' to '${targetStatus}'.`
          );
        }

        // 4. Update appointment status
        const [res] = await tx
          .update(appointments)
          .set({
            status: targetStatus,
            updatedAt: new Date(),
          })
          .where(and(eq(appointments.id, appointmentId), eq(appointments.clinicId, user.clinicId)))
          .returning();

        if (!res) {
          throw new Error('Failed to update appointment status');
        }

        // 5. Audit log
        await logAudit(tx, {
          clinicId: user.clinicId,
          actorId: user.id,
          action: 'appointment.status_change',
          entity: 'appointment',
          entityId: appointmentId,
          meta: {
            previousStatus: currentStatus,
            newStatus: targetStatus,
          },
        });

        return res;
      }
    );

    if (!updated) {
      throw new Error('Failed to change appointment status');
    }

    revalidatePath('/appointments');
    revalidatePath(`/appointments/${appointmentId}`);
    return { success: true, data: { id: updated.id, status: updated.status as AppointmentStatus } };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to change appointment status',
    };
  }
}
