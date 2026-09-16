import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { appointments } from './appointments';
import { users } from './users';
import { toothSurfaceEnum, toothConditionEnum } from './enums';

/**
 * Treatments table — dental procedures and treatments delivered or planned.
 */
export const treatments = pgTable(
  'treatments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge treatment records if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge treatments when patient record is deleted
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    // Set null: retain treatment clinical record even if appointment session is deleted
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    toothFdi: text('tooth_fdi'),
    procedureCode: text('procedure_code'),
    notes: text('notes'),
    cost: numeric('cost', { precision: 10, scale: 2 }).default('0.00').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('treatments_clinic_id_idx').on(table.clinicId),
    clinicPatientIdx: index('treatments_clinic_id_patient_id_idx').on(
      table.clinicId,
      table.patientId
    ),
  })
);

/**
 * Charting entries table — odontogram condition and surface tracking.
 */
export const chartingEntries = pgTable(
  'charting_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge charting entries if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge charting when patient record is purged
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    toothFdi: text('tooth_fdi').notNull(),
    surface: toothSurfaceEnum('surface').notNull(),
    condition: toothConditionEnum('condition').notNull(),
    recordedAt: timestamp('recorded_at', { withTimezone: true }).defaultNow().notNull(),
    // Restrict delete: preserve medical charting audit trail; user cannot be deleted if referenced
    recordedBy: uuid('recorded_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('charting_entries_clinic_id_idx').on(table.clinicId),
    clinicPatientToothIdx: index('charting_entries_clinic_patient_tooth_idx').on(
      table.clinicId,
      table.patientId,
      table.toothFdi
    ),
  })
);
