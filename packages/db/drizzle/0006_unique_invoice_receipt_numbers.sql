-- 1. Deterministic backfill for invoices if any invoice_number is NULL
WITH numbered_invoices AS (
  SELECT id, created_at,
         ROW_NUMBER() OVER (ORDER BY created_at) AS seq
  FROM "invoices"
  WHERE "invoice_number" IS NULL
)
UPDATE "invoices"
SET "invoice_number" = 'INV-' || TO_CHAR(numbered_invoices.created_at, 'YYYY') || '-' || LPAD(numbered_invoices.seq::text, 4, '0')
FROM numbered_invoices
WHERE "invoices"."id" = numbered_invoices.id;
--> statement-breakpoint
-- 2. Deterministic backfill for receipts if any receipt_number is NULL
WITH numbered_receipts AS (
  SELECT id, created_at,
         ROW_NUMBER() OVER (ORDER BY created_at) AS seq
  FROM "receipts"
  WHERE "receipt_number" IS NULL
)
UPDATE "receipts"
SET "receipt_number" = 'RCP-' || TO_CHAR(numbered_receipts.created_at, 'YYYY') || '-' || LPAD(numbered_receipts.seq::text, 4, '0')
FROM numbered_receipts
WHERE "receipts"."id" = numbered_receipts.id;
--> statement-breakpoint
-- 3. Unique index on invoices (clinic_id, invoice_number)
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_clinic_id_invoice_number_unique" ON "invoices" ("clinic_id", "invoice_number");
--> statement-breakpoint
-- 4. Unique index on receipts (clinic_id, receipt_number)
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_clinic_id_receipt_number_unique" ON "receipts" ("clinic_id", "receipt_number");
