import { pgTable, uuid, varchar, text, date, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

/**
 * Patients table — dental clinic patients.
 * Supports soft-deletion via deleted_at.
 */
export const patients = pgTable(
  'patients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: when a clinic is purged, all its patient records are purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }).notNull(),
    email: varchar('email', { length: 255 }),
    dob: date('dob'),
    gender: varchar('gender', { length: 50 }),
    address: text('address'),
    notes: text('notes'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('patients_clinic_id_idx').on(table.clinicId),
    clinicPhoneIdx: index('patients_clinic_id_phone_idx').on(table.clinicId, table.phone),
    clinicFullNameIdx: index('patients_clinic_id_full_name_idx').on(table.clinicId, table.fullName),
  })
);
