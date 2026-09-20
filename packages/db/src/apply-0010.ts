import 'dotenv/config';
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('DATABASE_URL required');

  console.log('Connecting to database...');
  const sql = postgres(url, { max: 1 });

  // 1. Commit enum additions first outside transaction block
  console.log('Step 1: Committing enum value additions...');
  await sql.unsafe(`ALTER TYPE "booking_request_channel" ADD VALUE IF NOT EXISTS 'patient_app';`);
  console.log('  ✅ booking_request_channel enum updated with patient_app');

  await sql.unsafe(`ALTER TYPE "conversation_channel" ADD VALUE IF NOT EXISTS 'patient_app';`);
  console.log('  ✅ conversation_channel enum updated with patient_app');

  // 2. Read migration 0010 and execute remaining statements
  console.log('Step 2: Executing migration 0010 statements...');
  const sqlContent = fs.readFileSync(
    path.join(__dirname, '../drizzle/0010_patient_api_and_devices.sql'),
    'utf-8'
  );

  const statements = sqlContent
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await sql.unsafe(statement);
  }

  console.log('  ✅ All statements in 0010_patient_api_and_devices.sql applied successfully.');

  // 3. Mark migration as applied in __drizzle_migrations table
  console.log('Step 3: Marking migration in __drizzle_migrations...');
  await sql.unsafe(`
    INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
    VALUES ('0010_patient_api_and_devices', ${Date.now()})
    ON CONFLICT DO NOTHING;
  `);

  console.log('🎉 Migration 0010 complete!');
  await sql.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
