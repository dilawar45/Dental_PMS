DO $$ BEGIN
  CREATE TYPE "public"."clinic_status" AS ENUM('pending', 'active', 'suspended', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "currency" varchar(10) DEFAULT 'PKR' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "qualification" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" varchar(50);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "address" text;