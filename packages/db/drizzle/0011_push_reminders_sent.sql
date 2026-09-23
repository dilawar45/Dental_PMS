CREATE TABLE IF NOT EXISTS "push_reminders_sent" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "clinic_id" uuid NOT NULL REFERENCES "clinics"("id") ON DELETE CASCADE,
  "appointment_id" uuid NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
  "reminder_type" text NOT NULL,
  "sent_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "push_reminders_sent_unique" UNIQUE ("appointment_id", "reminder_type")
);

CREATE INDEX IF NOT EXISTS "push_reminders_sent_clinic_appt_idx" ON "push_reminders_sent" ("clinic_id", "appointment_id");
