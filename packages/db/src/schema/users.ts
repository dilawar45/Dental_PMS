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
    // Cascade delete: when a clinic is deleted, all its staff accounts are removed (null for super_admin)
    clinicId: uuid('clinic_id').references(() => clinics.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: userRoleEnum('role').default('receptionist').notNull(),
    isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('users_clinic_id_idx').on(table.clinicId),
    emailUnique: uniqueIndex('users_email_unique').on(table.email),
    isSuperAdminIdx: index('users_is_super_admin_idx').on(table.isSuperAdmin),
  })
);
