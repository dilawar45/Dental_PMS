import {
  pgTable,
  uuid,
  text,
  integer,
  inet,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { appointments } from './appointments';

/**
 * Patient OTP records for SMS authentication.
 * Code hashes are stored (SHA-256), never plaintext.
 * 5-minute TTL, max 5 attempts before invalidation.
 */
export const patientOtps = pgTable(
  'patient_otps',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    phone: text('phone').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    phoneConsumedIdx: index('patient_otps_phone_consumed_idx').on(
      table.phone,
      table.consumedAt
    ),
  })
);

/**
 * Mobile devices registered to receive push notifications.
 * Scoped to clinic and patient with unique FCM token per patient.
 */
export const patientDevices = pgTable(
  'patient_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    fcmToken: text('fcm_token').notNull(),
    platform: text('platform').notNull(), // 'android' | 'ios'
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicPatientIdx: index('patient_devices_clinic_patient_idx').on(
      table.clinicId,
      table.patientId
    ),
    patientFcmTokenUnique: uniqueIndex('patient_devices_patient_fcm_unique').on(
      table.patientId,
      table.fcmToken
    ),
  })
);

/**
 * Tracks push reminders sent to avoid duplicate 24h or 2h notifications.
 */
export const pushRemindersSent = pgTable(
  'push_reminders_sent',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    appointmentId: uuid('appointment_id')
      .notNull()
      .references(() => appointments.id, { onDelete: 'cascade' }),
    reminderType: text('reminder_type').notNull(), // '24h' | '2h'
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueReminder: uniqueIndex('push_reminders_sent_unique').on(
      table.appointmentId,
      table.reminderType
    ),
    clinicApptIdx: index('push_reminders_sent_clinic_appt_idx').on(
      table.clinicId,
      table.appointmentId
    ),
  })
);
