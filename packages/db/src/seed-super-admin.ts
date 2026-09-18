import 'dotenv/config';
import { createDb } from './index';
import { users } from './schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('❌ Usage: pnpm --filter @dental-pms/db seed:super-admin <email>');
    process.exit(1);
  }

  const password = process.env['SEED_SUPER_ADMIN_PASSWORD'] || 'SuperAdminDev123!';
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const db = createDb(url);
  console.log(`🔐 Seeding platform super-admin account for: ${email}...`);

  // 1. Upsert in auth.users
  const existingAuth = await db.execute(
    sql`SELECT id FROM auth.users WHERE email = ${email} LIMIT 1`
  );

  const metaJson = JSON.stringify({
    full_name: 'Platform Super Admin',
    role: 'super_admin',
    is_super_admin: true,
  });

  let authUserId: string;
  if (existingAuth.length > 0 && existingAuth[0]?.['id']) {
    authUserId = existingAuth[0]['id'] as string;
    await db.execute(
      sql`UPDATE auth.users
          SET encrypted_password = crypt(${password}, gen_salt('bf')),
              email_confirmed_at = COALESCE(email_confirmed_at, now()),
              raw_user_meta_data = ${metaJson}::jsonb,
              raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
              updated_at = now()
          WHERE id = ${authUserId}`
    );
    console.log(`  ℹ️ Updated existing auth.users record: ${authUserId}`);
  } else {
    const insertedAuth = await db.execute(
      sql`INSERT INTO auth.users (
            id,
            instance_id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            confirmation_token,
            recovery_token,
            email_change_token_new,
            email_change,
            email_change_token_current,
            phone_change,
            phone_change_token,
            reauthentication_token,
            is_sso_user,
            is_anonymous,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            '00000000-0000-0000-0000-000000000000',
            'authenticated',
            'authenticated',
            ${email},
            crypt(${password}, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            ${metaJson}::jsonb,
            '', '', '', '', '', '', '', '',
            false,
            false,
            now(),
            now()
          ) RETURNING id`
    );
    authUserId = insertedAuth[0]!['id'] as string;
    console.log(`  ✅ Created new auth.users record: ${authUserId}`);
  }

  // Ensure identity exists
  await db.execute(
    sql`INSERT INTO auth.identities (
          id,
          provider_id,
          user_id,
          identity_data,
          provider,
          last_sign_in_at,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          ${authUserId}::text,
          ${authUserId}::uuid,
          jsonb_build_object('sub', ${authUserId}::text, 'email', ${email}::text),
          'email',
          now(),
          now(),
          now()
        ) ON CONFLICT (provider, provider_id) DO UPDATE SET
          identity_data = EXCLUDED.identity_data,
          updated_at = now()`
  );

  // 2. Upsert in public.users
  const existingPublicUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email));

  if (existingPublicUser.length > 0 && existingPublicUser[0]) {
    await db
      .update(users)
      .set({
        id: authUserId,
        clinicId: null,
        fullName: 'Platform Super Admin',
        role: 'super_admin',
        isSuperAdmin: true,
        active: true,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
    console.log(`  ℹ️ Updated existing public.users profile`);
  } else {
    await db.insert(users).values({
      id: authUserId,
      clinicId: null,
      email,
      fullName: 'Platform Super Admin',
      role: 'super_admin',
      isSuperAdmin: true,
      active: true,
    });
    console.log(`  ✅ Inserted new public.users profile`);
  }

  console.log(`\n🎉 Super-admin setup complete!`);
  console.log(`   Email: ${email}`);
  console.log(`   Role:  super_admin (clinic_id=NULL, is_super_admin=true)`);
  console.log(`   Password: ${password === 'SuperAdminDev123!' ? 'SuperAdminDev123! (default)' : '[custom]'}\n`);

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Failed to seed super-admin:', err);
  process.exit(1);
});
