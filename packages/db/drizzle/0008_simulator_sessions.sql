CREATE TABLE IF NOT EXISTS "simulator_sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "started_by" uuid NOT NULL REFERENCES "users"("id"),
  "label" text,
  "channel" text NOT NULL DEFAULT 'whatsapp',
  "phone" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "simulator_sessions_clinic_id_idx" ON "simulator_sessions" ("clinic_id");
--> statement-breakpoint

-- Enable Row-Level Security
ALTER TABLE "simulator_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "simulator_sessions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "simulator_sessions_isolation_policy" ON "simulator_sessions";
--> statement-breakpoint
CREATE POLICY "simulator_sessions_isolation_policy" ON "simulator_sessions"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER set_updated_at_simulator_sessions
  BEFORE UPDATE ON "simulator_sessions"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
