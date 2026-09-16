import { z } from 'zod';
import type { AppointmentStatus } from '@dental-pms/types';

// ─── Status Lifecycle Transition Machine ──────────────────────────────────────

export const ALLOWED_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['arrived', 'no_show', 'cancelled'],
  arrived: ['completed', 'cancelled'],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function isAllowedTransition(
  currentStatus: AppointmentStatus,
  targetStatus: AppointmentStatus
): boolean {
  const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid('Invalid patient ID'),
    dentistId: z.string().uuid('Invalid dentist ID'),
    startAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date/time',
    }),
    endAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid end date/time',
    }),
    reason: z
      .string()
      .trim()
      .min(2, 'Reason must be at least 2 characters')
      .max(255, 'Reason cannot exceed 255 characters'),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startAt).getTime();
      const end = new Date(data.endAt).getTime();
      return end > start;
    },
    {
      message: 'Appointment end time must be after the start time',
      path: ['endAt'],
    }
  );

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const updateAppointmentSchema = createAppointmentSchema.extend({
  appointmentId: z.string().uuid('Invalid appointment ID'),
});

export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;

export const changeStatusSchema = z.object({
  appointmentId: z.string().uuid('Invalid appointment ID'),
  targetStatus: z.enum([
    'scheduled',
    'confirmed',
    'arrived',
    'completed',
    'no_show',
    'cancelled',
  ]),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
