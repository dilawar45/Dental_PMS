import { pgTable, uuid, text, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { users } from './users';
import { userRoleEnum } from './enums';

/**
 * Platform Audit Log table — immutable cross-clinic governance audit trail.
 */
export const platformAuditLog = pgTable(
  'platform_audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    targetClinicId: uuid('target_clinic_id').references(() => clinics.id, { onDelete: 'set null' }),
    meta: jsonb('meta'),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    actorIdIdx: index('platform_audit_log_actor_id_idx').on(table.actorId),
    targetClinicIdIdx: index('platform_audit_log_target_clinic_id_idx').on(table.targetClinicId),
    atIdx: index('platform_audit_log_at_idx').on(table.at),
  })
);

/**
 * Clinic Invites table — one-time onboarding links for clinic owners and staff.
 */
export const clinicInvites = pgTable(
  'clinic_invites',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: userRoleEnum('role').default('owner').notNull(),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    tokenUnique: uniqueIndex('clinic_invites_token_unique').on(table.token),
    clinicIdIdx: index('clinic_invites_clinic_id_idx').on(table.clinicId),
    emailIdx: index('clinic_invites_email_idx').on(table.email),
  })
);
