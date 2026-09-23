import { pgTable, uuid, varchar, text, date, integer, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
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
    cnic: text('cnic'),
    passwordHash: text('password_hash'),
    age: integer('age'),
    address: text('address'),
    notes: text('notes'),
    expoPushToken: text('expo_push_token'),
    preferredLanguage: text('preferred_language').default('en').notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('patients_clinic_id_idx').on(table.clinicId),
    clinicPhoneIdx: index('patients_clinic_id_phone_idx').on(table.clinicId, table.phone),
    clinicFullNameIdx: index('patients_clinic_id_full_name_idx').on(table.clinicId, table.fullName),
    clinicCnicUnique: uniqueIndex('patients_clinic_cnic_unique')
      .on(table.clinicId, table.cnic)
      .where(sql`"cnic" IS NOT NULL`),
    clinicLowerEmailUnique: uniqueIndex('patients_clinic_lower_email_unique')
      .on(table.clinicId, sql`LOWER("email")`)
      .where(sql`"email" IS NOT NULL`),
  })
);

