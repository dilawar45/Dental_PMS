import { z } from 'zod';

export const approveBookingSchema = z
  .object({
    bookingRequestId: z.string().uuid('Invalid booking request ID'),
    dentistId: z.string().uuid('Invalid dentist ID'),
    patientId: z.string().uuid('Invalid patient ID').optional(),
    startAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid start date/time',
    }),
    endAt: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: 'Invalid end date/time',
    }),
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

export type ApproveBookingInput = z.infer<typeof approveBookingSchema>;

export const rejectBookingSchema = z.object({
  bookingRequestId: z.string().uuid('Invalid booking request ID'),
  reason: z
    .string()
    .trim()
    .min(2, 'Rejection reason must be at least 2 characters')
    .max(500, 'Rejection reason cannot exceed 500 characters'),
});

export type RejectBookingInput = z.infer<typeof rejectBookingSchema>;

export const linkPatientSchema = z.object({
  bookingRequestId: z.string().uuid('Invalid booking request ID'),
  patientId: z.string().uuid('Invalid patient ID'),
});

export type LinkPatientInput = z.infer<typeof linkPatientSchema>;
