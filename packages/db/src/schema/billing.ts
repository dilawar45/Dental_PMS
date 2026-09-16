import {
  pgTable,
  uuid,
  text,
  varchar,
  numeric,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { patients } from './patients';
import { appointments } from './appointments';
import { users } from './users';

export interface InvoiceLineItem {
  description: string;
  amount: string;
  quantity: number;
  subtotal: string;
}

/**
 * Invoices table — dental billing invoices.
 */
export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge invoices if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge billing invoices if patient record is removed
    patientId: uuid('patient_id')
      .notNull()
      .references(() => patients.id, { onDelete: 'cascade' }),
    // Set null: retain invoice even if the appointment is removed
    appointmentId: uuid('appointment_id').references(() => appointments.id, {
      onDelete: 'set null',
    }),
    invoiceNumber: varchar('invoice_number', { length: 50 }),
    items: jsonb('items').$type<InvoiceLineItem[]>().default([]).notNull(),
    subtotal: numeric('subtotal', { precision: 10, scale: 2 }).default('0.00').notNull(),
    taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).default('0.00').notNull(),
    tax: numeric('tax', { precision: 10, scale: 2 }).default('0.00').notNull(),
    total: numeric('total', { precision: 10, scale: 2 }).default('0.00').notNull(),
    paid: numeric('paid', { precision: 10, scale: 2 }).default('0.00').notNull(),
    status: varchar('status', { length: 50 }).default('unpaid').notNull(),
    notes: text('notes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('invoices_clinic_id_idx').on(table.clinicId),
    clinicPatientIdx: index('invoices_clinic_id_patient_id_idx').on(
      table.clinicId,
      table.patientId
    ),
    clinicInvoiceNumberUnique: uniqueIndex('invoices_clinic_id_invoice_number_unique').on(
      table.clinicId,
      table.invoiceNumber
    ),
  })
);

/**
 * Receipts table — payment receipts and generated PDF storage references.
 */
export const receipts = pgTable(
  'receipts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    // Cascade delete: purge receipts if clinic is purged
    clinicId: uuid('clinic_id')
      .notNull()
      .references(() => clinics.id, { onDelete: 'cascade' }),
    // Cascade delete: purge receipt if parent invoice is deleted
    invoiceId: uuid('invoice_id')
      .notNull()
      .references(() => invoices.id, { onDelete: 'cascade' }),
    receiptNumber: varchar('receipt_number', { length: 50 }),
    amount: numeric('amount', { precision: 10, scale: 2 }).default('0.00').notNull(),
    method: varchar('method', { length: 50 }).default('cash').notNull(),
    receivedBy: uuid('received_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    storageKey: text('storage_key').notNull(),
    notes: text('notes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).defaultNow().notNull(),
    sentVia: varchar('sent_via', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicIdIdx: index('receipts_clinic_id_idx').on(table.clinicId),
    clinicInvoiceIdx: index('receipts_clinic_id_invoice_id_idx').on(
      table.clinicId,
      table.invoiceId
    ),
    clinicReceiptNumberUnique: uniqueIndex('receipts_clinic_id_receipt_number_unique').on(
      table.clinicId,
      table.receiptNumber
    ),
  })
);
