import { z } from 'zod';

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(255),
  amount: z
    .string()
    .trim()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Amount must be greater than 0',
    }),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
});

export type LineItemInput = z.infer<typeof lineItemSchema>;

export const createInvoiceSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID'),
  appointmentId: z.string().uuid('Invalid appointment ID').optional().or(z.literal('')),
  lineItems: z
    .array(lineItemSchema)
    .min(1, 'At least one line item is required to generate an invoice'),
  taxRate: z
    .string()
    .trim()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0, {
      message: 'Tax rate must be a valid non-negative percentage',
    })
    .default('0.00'),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  amount: z
    .string()
    .trim()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'Payment amount must be greater than 0',
    }),
  method: z.enum(['cash', 'card', 'bank_transfer', 'easypaisa', 'jazzcash'], {
    message: 'Invalid payment method selected',
  }),
  notes: z.string().trim().max(500).optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  reason: z
    .string()
    .trim()
    .min(3, 'Void reason must be at least 3 characters')
    .max(500, 'Void reason cannot exceed 500 characters'),
});

export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;
