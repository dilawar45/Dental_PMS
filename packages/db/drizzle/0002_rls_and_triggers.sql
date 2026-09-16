-- 1. Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

-- 2. Attach updated_at triggers to all tables with updated_at
CREATE OR REPLACE TRIGGER set_updated_at_clinics BEFORE UPDATE ON "clinics" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_users BEFORE UPDATE ON "users" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_patients BEFORE UPDATE ON "patients" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_consents BEFORE UPDATE ON "consents" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_appointments BEFORE UPDATE ON "appointments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_booking_requests BEFORE UPDATE ON "booking_requests" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_charting_entries BEFORE UPDATE ON "charting_entries" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_treatments BEFORE UPDATE ON "treatments" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_files BEFORE UPDATE ON "files" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_conversations BEFORE UPDATE ON "conversations" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_messages BEFORE UPDATE ON "messages" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_calls BEFORE UPDATE ON "calls" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_handoffs BEFORE UPDATE ON "handoffs" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_invoices BEFORE UPDATE ON "invoices" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_receipts BEFORE UPDATE ON "receipts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_broadcasts BEFORE UPDATE ON "broadcasts" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_broadcast_recipients BEFORE UPDATE ON "broadcast_recipients" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint
CREATE OR REPLACE TRIGGER set_updated_at_audit_log BEFORE UPDATE ON "audit_log" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
--> statement-breakpoint

-- 3. Enable Row-Level Security (RLS) and FORCE RLS on all clinic-owned tables
ALTER TABLE "clinics" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "clinics" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "clinics_isolation_policy" ON "clinics";
--> statement-breakpoint
CREATE POLICY "clinics_isolation_policy" ON "clinics"
  FOR ALL
  USING (id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "users_isolation_policy" ON "users";
--> statement-breakpoint
CREATE POLICY "users_isolation_policy" ON "users"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "patients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "patients_isolation_policy" ON "patients";
--> statement-breakpoint
CREATE POLICY "patients_isolation_policy" ON "patients"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "consents" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "consents_isolation_policy" ON "consents";
--> statement-breakpoint
CREATE POLICY "consents_isolation_policy" ON "consents"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "appointments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "appointments_isolation_policy" ON "appointments";
--> statement-breakpoint
CREATE POLICY "appointments_isolation_policy" ON "appointments"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "booking_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "booking_requests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "booking_requests_isolation_policy" ON "booking_requests";
--> statement-breakpoint
CREATE POLICY "booking_requests_isolation_policy" ON "booking_requests"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "charting_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "charting_entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "charting_entries_isolation_policy" ON "charting_entries";
--> statement-breakpoint
CREATE POLICY "charting_entries_isolation_policy" ON "charting_entries"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "treatments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "treatments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "treatments_isolation_policy" ON "treatments";
--> statement-breakpoint
CREATE POLICY "treatments_isolation_policy" ON "treatments"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "files" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "files_isolation_policy" ON "files";
--> statement-breakpoint
CREATE POLICY "files_isolation_policy" ON "files"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "conversations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "conversations_isolation_policy" ON "conversations";
--> statement-breakpoint
CREATE POLICY "conversations_isolation_policy" ON "conversations"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "messages" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "messages_isolation_policy" ON "messages";
--> statement-breakpoint
CREATE POLICY "messages_isolation_policy" ON "messages"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "calls" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "calls" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "calls_isolation_policy" ON "calls";
--> statement-breakpoint
CREATE POLICY "calls_isolation_policy" ON "calls"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "handoffs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "handoffs" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "handoffs_isolation_policy" ON "handoffs";
--> statement-breakpoint
CREATE POLICY "handoffs_isolation_policy" ON "handoffs"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "invoices_isolation_policy" ON "invoices";
--> statement-breakpoint
CREATE POLICY "invoices_isolation_policy" ON "invoices"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "receipts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "receipts_isolation_policy" ON "receipts";
--> statement-breakpoint
CREATE POLICY "receipts_isolation_policy" ON "receipts"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "broadcasts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "broadcasts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "broadcasts_isolation_policy" ON "broadcasts";
--> statement-breakpoint
CREATE POLICY "broadcasts_isolation_policy" ON "broadcasts"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "broadcast_recipients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "broadcast_recipients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "broadcast_recipients_isolation_policy" ON "broadcast_recipients";
--> statement-breakpoint
CREATE POLICY "broadcast_recipients_isolation_policy" ON "broadcast_recipients"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_log_isolation_policy" ON "audit_log";
--> statement-breakpoint
CREATE POLICY "audit_log_isolation_policy" ON "audit_log"
  FOR ALL
  USING (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid)
  WITH CHECK (clinic_id = NULLIF(current_setting('app.clinic_id', true), '')::uuid);
--> statement-breakpoint

-- dev_outbox remains exempt from RLS per specification
