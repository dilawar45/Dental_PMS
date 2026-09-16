import { pgTable, uuid, varchar, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { userRoleEnum } from './enums';

/**
 * Users table — clinic staff accounts (owners, dentists, receptionists, assistants).
 * Linked 1:1 with Supabase auth.users on `id`.
 * Password storage is delegated exclusively to Supabase Auth.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: when a clinic is deleted, all its staff accounts are removed
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('receptionist').notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('users_clinic_id_idx').on(table.clinicId),
    clinicEmailUnique: uniqueIndex('users_clinic_id_email_unique').on(table.clinicId, table.email),
  })
);
