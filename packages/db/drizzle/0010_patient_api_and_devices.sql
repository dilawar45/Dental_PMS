CREATE TABLE IF NOT EXISTS "patient_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"ip" inet,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_otps_phone_consumed_idx" ON "patient_otps" ("phone", "consumed_at");
--> statement-breakpoint
ALTER TABLE "patient_otps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "patient_otps_service_policy" ON "patient_otps";
--> statement-breakpoint
CREATE POLICY "patient_otps_service_policy" ON "patient_otps"
  FOR ALL
  TO authenticated, anon, postgres, service_role
  USING (true)
  WITH CHECK (true);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "patient_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
	"patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
	"fcm_token" text NOT NULL,
	"platform" text NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_devices_clinic_patient_idx" ON "patient_devices" ("clinic_id", "patient_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_devices_patient_fcm_unique" ON "patient_devices" ("patient_id", "fcm_token");
--> statement-breakpoint
ALTER TABLE "patient_devices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "patient_devices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "patient_devices_isolation_policy" ON "patient_devices";
--> statement-breakpoint
CREATE POLICY "patient_devices_isolation_policy" ON "patient_devices"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "expo_push_token" text;
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "preferred_language" text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;
