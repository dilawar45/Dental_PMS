import {
  pgTable,
  uuid,
  text,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';

/**
 * Broadcasts table — bulk outreach and marketing campaigns.
 */
export const broadcasts = pgTable(
  'broadcasts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge broadcasts if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    template: text('template').notNull(),
    audienceFilter: jsonb('audience_filter').default({}).notNull(),
    status: varchar('status', { length: 50 }).default('draft').notNull(),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('broadcasts_clinic_id_idx').on(table.clinicId),
  })
);

/**
 * Broadcast recipients table — per-patient campaign delivery status.
 */
export const broadcastRecipients = pgTable(
  'broadcast_recipients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge recipients if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge recipient rows if broadcast campaign is deleted
    broadcastId: uuid('broadcast_id')
      .notNull()
      .references(() => broadcasts.id, { onDelete: 'cascade' }),
    // Cascade delete: purge recipient status if patient is purged
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 50 }).default('queued').notNull(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('broadcast_recipients_clinic_id_idx').on(table.clinicId),
    broadcastStatusIdx: index('broadcast_recipients_broadcast_status_idx').on(
      table.broadcastId,
      table.status
    ),
  })
);
