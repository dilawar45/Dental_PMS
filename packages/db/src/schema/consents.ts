import { pgTable, uuid, text, inet, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { consentTypeEnum } from './enums';

/**
 * Patient consents table for data processing, marketing, and communication reminders.
 */
export const consents = pgTable(
  'consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: when clinic is purged, all patient consents are purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: when patient is purged, all associated consent records are purged
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    type: consentTypeEnum('type').notNull(),
    version: text('version').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    ip: inet('ip'),
    textSnapshot: text('text_snapshot').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('consents_clinic_id_idx').on(table.clinicId),
    clinicPatientIdx: index('consents_clinic_id_patient_id_idx').on(table.clinicId, table.patientId),
  })
);
