import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { users } from './users';

/**
 * Simulator sessions table — tracking staff demo sessions and channels.
 */
export const simulatorSessions = pgTable(
  'simulator_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    startedBy: uuid('started_by')
      .notNull()
      .references(() => users.id),
    label: text('label'),
    channel: text('channel').default('whatsapp').notNull(),
    phone: text('phone').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('simulator_sessions_clinic_id_idx').on(table.clinicId),
  })
);
