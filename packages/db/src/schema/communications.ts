import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { users } from './users';
import {
  conversationChannelEnum,
  conversationStatusEnum,
  messageDirectionEnum,
  handoffUrgencyEnum,
} from './enums';

/**
 * Conversations table — omnichannel communication threads.
 */
export const conversations = pgTable(
  'conversations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge conversations if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Set null: preserve customer conversation threads even if patient profile is purged
    patientId: uuid('patient_id').references(() => patients.id, {
      onDelete: 'set null',
    }),
    channel: conversationChannelEnum('channel').notNull(),
    externalThreadId: varchar('external_thread_id', { length: 255 }).notNull(),
    status: conversationStatusEnum('status').default('open').notNull(),
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('conversations_clinic_id_idx').on(table.clinicId),
    clinicChannelThreadUnique: uniqueIndex('conversations_clinic_channel_thread_unique').on(
      table.clinicId,
      table.channel,
      table.externalThreadId
    ),
  })
);

/**
 * Messages table — omnichannel chat messages within a conversation.
 */
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge messages if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge messages if conversation is deleted
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    direction: messageDirectionEnum('direction').notNull(),
    body: text('body').notNull(),
    mediaUrl: text('media_url'),
    providerMessageId: varchar('provider_message_id', { length: 255 }),
    status: varchar('status', { length: 50 }).default('sent').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('messages_clinic_id_idx').on(table.clinicId),
    clinicConvSentIdx: index('messages_clinic_conv_sent_idx').on(
      table.clinicId,
      table.conversationId,
      table.sentAt
    ),
  })
);

/**
 * Calls table — voice telephony session logs and transcripts.
 */
export const calls = pgTable(
  'calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge calls if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge calls if conversation is deleted
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    direction: messageDirectionEnum('direction').notNull(),
    providerCallId: varchar('provider_call_id', { length: 255 }),
    durationSec: integer('duration_sec'),
    transcript: text('transcript'),
    recordingUrl: text('recording_url'),
    outcome: text('outcome'),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('calls_clinic_id_idx').on(table.clinicId),
    clinicConvIdx: index('calls_clinic_conv_idx').on(
      table.clinicId,
      table.conversationId
    ),
  })
);

/**
 * Handoffs table — escalation from AI agent to human receptionist.
 */
export const handoffs = pgTable(
  'handoffs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge handoffs if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge handoffs if conversation is deleted
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    reason: text('reason').notNull(),
    urgency: handoffUrgencyEnum('urgency').default('normal').notNull(),
    // Set null: unassign handoff if assigned receptionist/staff is deleted
    assignedTo: uuid('assigned_to').references(() => users.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('handoffs_clinic_id_idx').on(table.clinicId),
    clinicConvIdx: index('handoffs_clinic_conv_idx').on(
      table.clinicId,
      table.conversationId
    ),
  })
);
