import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { users } from './users';

/**
 * Audit log table — immutable audit trail for compliance and operations.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge audit log if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Set null: retain audit log entry even if user account is removed
    actorId: uuid('actor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: varchar('action', { length: 255 }).notNull(),
    entity: varchar('entity', { length: 100 }).notNull(),
    entityId: uuid('entity_id'),
    meta: jsonb('meta'),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('audit_log_clinic_id_idx').on(table.clinicId),
    clinicAtIdx: index('audit_log_clinic_at_idx').on(table.clinicId, table.at),
    clinicEntityIdx: index('audit_log_clinic_entity_idx').on(
      table.clinicId,
      table.entity,
      table.entityId
    ),
  })
);
