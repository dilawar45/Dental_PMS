import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { clinicStatusEnum } from './enums';

/**
 * Clinics table — multi-clinic tenant anchor.
 * Every clinic-owned resource references this table.
 */
export const clinics = pgTable('clinics', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique(),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  timezone: varchar('timezone', { length: 50 }).default('Asia/Karachi').notNull(),
  locale: varchar('locale', { length: 20 }).default('en-PK').notNull(),
  status: clinicStatusEnum('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
