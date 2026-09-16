import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { users } from './users';
import {
  appointmentStatusEnum,
  bookingRequestStatusEnum,
  bookingRequestChannelEnum,
} from './enums';

/**
 * Appointments table — practitioner and patient scheduling.
 */
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge appointments if clinic is removed
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge appointment when patient is purged
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    // Restrict delete: preserve scheduled/completed appointments if dentist account is removed
    dentistId: uuid('dentist_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    startAt: timestamp('start_at', { withTimezone: true }).notNull(),
    endAt: timestamp('end_at', { withTimezone: true }).notNull(),
    status: appointmentStatusEnum('status').default('scheduled').notNull(),
    reason: text('reason'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('appointments_clinic_id_idx').on(table.clinicId),
    clinicStartAtIdx: index('appointments_clinic_start_at_idx').on(
      table.clinicId,
      table.startAt
    ),
    clinicDentistStartAtIdx: index('appointments_clinic_dentist_start_at_idx').on(
      table.clinicId,
      table.dentistId,
      table.startAt
    ),
  })
);

/**
 * Booking requests table — patient inquiries from communication channels or staff.
 */
export const bookingRequests = pgTable(
  'booking_requests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge booking requests when clinic is removed
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Set null: preserve booking request even if prospective patient profile is removed
    patientId: uuid('patient_id').references(() => patients.id, {
      onDelete: 'set null',
    }),
    patientPhone: text('patient_phone'),
    patientName: text('patient_name'),
    requestedSlotStart: timestamp('requested_slot_start', {
      withTimezone: true,
    }).notNull(),
    requestedSlotEnd: timestamp('requested_slot_end', {
      withTimezone: true,
    }).notNull(),
    reason: text('reason'),
    notes: text('notes'),
    status: bookingRequestStatusEnum('status').default('pending').notNull(),
    requestedVia: bookingRequestChannelEnum('requested_via').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('booking_requests_clinic_id_idx').on(table.clinicId),
  })
);
