ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_number" varchar(50);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "items" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "subtotal" numeric(10, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax_rate" numeric(5, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "tax" numeric(10, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "notes" text;
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "receipt_number" varchar(50);
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "amount" numeric(10, 2) DEFAULT '0.00' NOT NULL;
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "method" varchar(50) DEFAULT 'cash' NOT NULL;
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "received_by" uuid REFERENCES "users"("id") ON DELETE set null;
--> statement-breakpoint
ALTER TABLE "receipts" ADD COLUMN IF NOT EXISTS "notes" text;
