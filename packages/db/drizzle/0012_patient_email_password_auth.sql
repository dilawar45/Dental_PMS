-- Migration 0012: Patient Email/Password Auth & Password Resets

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "cnic" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "password_hash" text;
ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "age" integer;

CREATE UNIQUE INDEX IF NOT EXISTS "patients_clinic_cnic_unique" 
  ON "patients" ("clinic_id", "cnic") 
  WHERE "cnic" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "patients_clinic_lower_email_unique" 
  ON "patients" ("clinic_id", LOWER("email")) 
  WHERE "email" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "patient_password_resets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "patient_id" uuid NOT NULL REFERENCES "patients"("id") ON DELETE CASCADE,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "ip" inet,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "patient_password_resets_patient_consumed_idx" 
  ON "patient_password_resets" ("patient_id", "consumed_at");

CREATE INDEX IF NOT EXISTS "patient_password_resets_token_hash_idx" 
  ON "patient_password_resets" ("token_hash");

ALTER TABLE "patient_password_resets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "patient_password_resets" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "patient_password_resets_isolation_policy" ON "patient_password_resets";
CREATE POLICY "patient_password_resets_isolation_policy" ON "patient_password_resets"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);

