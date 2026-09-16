ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "patient_phone" text;
--> statement-breakpoint
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "patient_name" text;
--> statement-breakpoint
ALTER TABLE "booking_requests" ADD COLUMN IF NOT EXISTS "notes" text;
