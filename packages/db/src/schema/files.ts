import {
  pgTable,
  uuid,
  text,
  varchar,
  bigint,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { users } from './users';
import { fileKindEnum } from './enums';

/**
 * Files table — patient media assets, radiographs, receipts, and clinical documents.
 */
export const files = pgTable(
  'files',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge files if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge file records when patient is removed
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    kind: fileKindEnum('kind').notNull(),
    storageKey: text('storage_key').notNull(),
    mime: varchar('mime', { length: 100 }).notNull(),
    size: bigint('size', { mode: 'number' }).notNull(),
    // Set null: retain patient file record if the staff member who uploaded it is deleted
    uploadedBy: uuid('uploaded_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('files_clinic_id_idx').on(table.clinicId),
    clinicPatientIdx: index('files_clinic_id_patient_id_idx').on(
      table.clinicId,
      table.patientId
    ),
  })
);
