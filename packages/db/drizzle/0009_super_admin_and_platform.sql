-- Migration 0009: Platform Super-Admin + Multi-Tenant Onboarding

-- 1. Update user_role enum to include 'super_admin'
ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'super_admin';
--> statement-breakpoint

-- 2. Create clinic_status enum
DO $$ BEGIN
  CREATE TYPE "clinic_status" AS ENUM('pending', 'active', 'suspended', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 3. Update clinics table: add status column
ALTER TABLE "clinics" ADD COLUMN IF NOT EXISTS "status" "clinic_status" DEFAULT 'active' NOT NULL;
--> statement-breakpoint

-- 4. Update users table: make clinic_id nullable and add is_super_admin column
ALTER TABLE "users" ALTER COLUMN "clinic_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_super_admin" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_is_super_admin_idx" ON "users" ("is_super_admin");
--> statement-breakpoint

-- 5. Create platform_audit_log table
CREATE TABLE IF NOT EXISTS "platform_audit_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "action" text NOT NULL,
  "entity" text NOT NULL,
  "entity_id" uuid,
  "target_clinic_id" uuid REFERENCES "clinics"("id") ON DELETE SET NULL,
  "meta" jsonb,
  "at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_log_actor_id_idx" ON "platform_audit_log" ("actor_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_log_target_clinic_id_idx" ON "platform_audit_log" ("target_clinic_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "platform_audit_log_at_idx" ON "platform_audit_log" ("at");
--> statement-breakpoint

-- 6. Create clinic_invites table
CREATE TABLE IF NOT EXISTS "clinic_invites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" "user_role" DEFAULT 'owner' NOT NULL,
  "token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clinic_invites_token_unique" ON "clinic_invites" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_invites_clinic_id_idx" ON "clinic_invites" ("clinic_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "clinic_invites_email_idx" ON "clinic_invites" ("email");
--> statement-breakpoint

-- 7. Define is_super_admin() security definer function (Clarification 2)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = NULLIF(current_setting('app.actor_id', true), '')::uuid
      AND is_super_admin = true
      AND role = 'super_admin'
  );
$$;
--> statement-breakpoint

-- 8. Update RLS policies on clinics and users tables
DROP POLICY IF EXISTS "clinics_isolation_policy" ON "clinics";
--> statement-breakpoint
CREATE POLICY "clinics_isolation_policy" ON "clinics"
  FOR ALL
  USING (
    is_super_admin() OR
    id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
  )
  WITH CHECK (
    is_super_admin() OR
    id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
  );
--> statement-breakpoint

DROP POLICY IF EXISTS "users_isolation_policy" ON "users";
--> statement-breakpoint
CREATE POLICY "users_isolation_policy" ON "users"
  FOR ALL
  USING (
    is_super_admin() OR
    clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
  )
  WITH CHECK (
    is_super_admin() OR
    clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid
  );
--> statement-breakpoint

-- 9. Enable RLS on platform tables
ALTER TABLE "platform_audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "platform_audit_log_policy" ON "platform_audit_log";
--> statement-breakpoint
CREATE POLICY "platform_audit_log_policy" ON "platform_audit_log"
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
--> statement-breakpoint

ALTER TABLE "clinic_invites" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "clinic_invites_policy" ON "clinic_invites";
--> statement-breakpoint
CREATE POLICY "clinic_invites_policy" ON "clinic_invites"
  FOR ALL
  USING (true)
  WITH CHECK (is_super_admin() OR true);
--> statement-breakpoint
