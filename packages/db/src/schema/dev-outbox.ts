import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Dev outbox table — mock providers log messages here instead of
 * making real network calls. Useful for inspecting what would have
 * been sent in production.
 */
export const devOutbox = pgTable('dev_outbox', {
  id: uuid('id').defaultRandom().primaryKey(),
  channel: varchar('channel', { length: 50 }).notNull(),
  from: varchar('from', { length: 255 }).notNull(),
  to: varchar('to', { length: 255 }).notNull(),
  body: text('body').notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(), // 'inbound' | 'outbound'
  metadata: text('metadata'), // JSON string for extra data
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
