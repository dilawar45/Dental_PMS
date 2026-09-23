import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createDb } from './index';
import {
  clinics,
  users,
  patients,
  consents,
  appointments,
  bookingRequests,
  treatments,
  chartingEntries,
  invoices,
  receipts,
  conversations,
  messages,
  devOutbox,
} from './schema';
import { eq, sql } from 'drizzle-orm';

async function main() {
  const url = process.env['DATABASE_URL'];
  if (!url) {
    throw new Error('DATABASE_URL is required');
  }

  const db = createDb(url);
  console.log('🌱 Starting idempotent database seed...\n');

  // 1. Clinic
  console.log('  [1/9] Upserting clinic: Bright Smile Dental...');
  let clinic = await db.query?.clinics?.findFirst({
    where: eq(clinics.slug, 'bright-smile'),
  });

  const existingClinics = await db
    .select()
    .from(clinics)
    .where(eq(clinics.slug, 'bright-smile'));

  if (existingClinics.length > 0 && existingClinics[0]) {
    clinic = existingClinics[0];
    await db
      .update(clinics)
      .set({
        name: 'Bright Smile Dental',
        address: '14-C Gulberg III, MM Alam Road, Lahore, Pakistan',
        phone: '+924235750000',
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
      })
      .where(eq(clinics.id, clinic.id));
    console.log(`    ℹ️ Existing clinic updated: ${clinic.name} (${clinic.id})`);
  } else {
    const [newClinic] = await db
      .insert(clinics)
      .values({
        name: 'Bright Smile Dental',
        slug: 'bright-smile',
        address: '14-C Gulberg III, MM Alam Road, Lahore, Pakistan',
        phone: '+924235750000',
        timezone: 'Asia/Karachi',
        locale: 'en-PK',
      })
      .returning();
    clinic = newClinic!;
    console.log(`    ✅ Clinic created: ${clinic.name} (${clinic.id})`);
  }

  const clinicId = clinic.id;

  // Clean existing child records for idempotency (cascades cleanly from patients & conversations)
  console.log('  [2/9] Resetting clinic child records for clean idempotent seed...');
  await db.delete(chartingEntries).where(eq(chartingEntries.clinicId, clinicId));
  await db.delete(bookingRequests).where(eq(bookingRequests.clinicId, clinicId));
  await db.delete(conversations).where(eq(conversations.clinicId, clinicId));
  await db.delete(appointments).where(eq(appointments.clinicId, clinicId));
  await db.execute(
    sql`DELETE FROM appointments WHERE dentist_id IN (SELECT id FROM users WHERE clinic_id = ${clinicId})`
  );
  await db.delete(patients).where(eq(patients.clinicId, clinicId));
  await db.delete(users).where(eq(users.clinicId, clinicId));

  // 2. Users (4 staff members synced with Supabase Auth)
  console.log('  [3/9] Seeding 4 clinic staff users in Supabase Auth & public.users...');
  const staffSpecs = [
    {
      email: 'owner@brightsmile.com',
      fullName: 'Dr. Tariq Mahmood',
      role: 'owner' as const,
    },
    {
      email: 'dentist@brightsmile.com',
      fullName: 'Dr. Ayesha Khan',
      role: 'dentist' as const,
    },
    {
      email: 'receptionist@brightsmile.com',
      fullName: 'Sana Ali',
      role: 'receptionist' as const,
    },
    {
      email: 'assistant@brightsmile.com',
      fullName: 'Bilal Ahmed',
      role: 'assistant' as const,
    },
  ];

  // Purge any legacy/orphaned auth accounts so auth.users contains exactly the 4 deterministic staff
  const staffEmails = staffSpecs.map((s) => s.email);
  await db.execute(
    sql`DELETE FROM auth.users WHERE email NOT IN ('owner@brightsmile.com', 'dentist@brightsmile.com', 'receptionist@brightsmile.com', 'assistant@brightsmile.com')`
  );
  const seededUsers: Array<typeof users.$inferSelect> = [];

  for (const staff of staffSpecs) {
    // 1. Ensure user exists in Supabase auth.users with DevPassword123!
    const existingAuth = await db.execute(
      sql`SELECT id FROM auth.users WHERE email = ${staff.email} LIMIT 1`
    );

    const metaJson = JSON.stringify({ full_name: staff.fullName, role: staff.role });

    let authUserId: string;
    if (existingAuth.length > 0 && existingAuth[0]?.['id']) {
      authUserId = existingAuth[0]['id'] as string;
      await db.execute(
        sql`UPDATE auth.users 
            SET encrypted_password = crypt('DevPassword123!', gen_salt('bf')),
                email_confirmed_at = COALESCE(email_confirmed_at, now()),
                raw_user_meta_data = ${metaJson}::jsonb,
                confirmation_token = COALESCE(confirmation_token, ''),
                recovery_token = COALESCE(recovery_token, ''),
                email_change_token_new = COALESCE(email_change_token_new, ''),
                email_change = COALESCE(email_change, ''),
                email_change_token_current = COALESCE(email_change_token_current, ''),
                phone_change = COALESCE(phone_change, ''),
                phone_change_token = COALESCE(phone_change_token, ''),
                reauthentication_token = COALESCE(reauthentication_token, ''),
                updated_at = now()
            WHERE id = ${authUserId}`
      );
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
              ${staff.email},
              crypt('DevPassword123!', gen_salt('bf')),
              now(),
              '{"provider":"email","providers":["email"]}'::jsonb,
              ${metaJson}::jsonb,
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              '',
              false,
              false,
              now(),
              now()
            ) RETURNING id`
      );
      authUserId = insertedAuth[0]!['id'] as string;
    }

    // Ensure corresponding identity exists in auth.identities
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
            jsonb_build_object('sub', ${authUserId}::text, 'email', ${staff.email}::text),
            'email',
            now(),
            now(),
            now()
          )
          ON CONFLICT (provider, provider_id) DO UPDATE SET
            identity_data = EXCLUDED.identity_data,
            updated_at = now()`
    );

    // 2. Ensure user exists in public.users linked to this clinic
    const [profile] = await db
      .insert(users)
      .values({
        id: authUserId,
        clinicId,
        email: staff.email,
        fullName: staff.fullName,
        role: staff.role,
        active: true,
      })
      .onConflictDoUpdate({
        target: [users.id],
        set: {
          clinicId,
          email: staff.email,
          fullName: staff.fullName,
          role: staff.role,
          active: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    seededUsers.push(profile!);
    console.log(`    ✅ Synced Auth User: ${staff.email} (${staff.role}) -> ${authUserId}`);
  }

  const dentistUser = seededUsers.find((u) => u.role === 'dentist') ?? seededUsers[0]!;
  const ownerDentist = seededUsers.find((u) => u.role === 'owner') ?? seededUsers[0]!;

  // 3. Patients (30 Pakistani patients)
  console.log('  [4/9] Seeding 30 patients with Pakistani demographics...');
  const pakistaniPatientsData = [
    { name: 'Muhammad Usman', phone: '+923001234501', gender: 'male', dob: '1988-04-12', address: 'House 45, Sector B, DHA Phase 5, Lahore' },
    { name: 'Fatima Zahra', phone: '+923001234502', gender: 'female', dob: '1992-09-24', address: 'Flat 302, Green Heights, Gulberg III, Lahore' },
    { name: 'Ali Raza', phone: '+923001234503', gender: 'male', dob: '1985-01-15', address: 'Plot 12, Street 4, Model Town C Block, Lahore' },
    { name: 'Zainab Bibi', phone: '+923001234504', gender: 'female', dob: '1995-11-03', address: 'House 89, Sector J, Johar Town, Lahore' },
    { name: 'Ahmed Hassan', phone: '+923001234505', gender: 'male', dob: '1979-07-19', address: 'House 112, Cavalry Ground, Lahore Cantt' },
    { name: 'Maryam Nawaz', phone: '+923001234506', gender: 'female', dob: '1990-03-30', address: 'Villa 7, Askari 10, Airport Road, Lahore' },
    { name: 'Hamza Tariq', phone: '+923001234507', gender: 'male', dob: '1993-12-08', address: 'Street 9, Canal View Society, Lahore' },
    { name: 'Ayesha Siddiqua', phone: '+923001234508', gender: 'female', dob: '1987-05-22', address: 'House 67, Garden Town, Lahore' },
    { name: 'Bilal Siddiqui', phone: '+923001234509', gender: 'male', dob: '1991-08-14', address: 'Sector E, Bahria Town, Lahore' },
    { name: 'Sana Javed', phone: '+923001234510', gender: 'female', dob: '2017-04-10', address: 'House 23, PCSIR Society Phase 2, Lahore' },
    { name: 'Zeeshan Ali', phone: '+923001234511', gender: 'male', dob: '1984-10-05', address: 'Wapda Town Phase 1, Lahore' },
    { name: 'Hira Mani', phone: '+923001234512', gender: 'female', dob: '2019-08-14', address: 'Main Boulevard, Faisal Town, Lahore' },
    { name: 'Omer Farooq', phone: '+923001234513', gender: 'male', dob: '1976-11-29', address: 'Shadman 2, Jail Road, Lahore' },
    { name: 'Rabia Anum', phone: '+923001234514', gender: 'female', dob: '1994-04-02', address: 'Valancia Town, Block H, Lahore' },
    { name: 'Mustafa Kamal', phone: '+923001234515', gender: 'male', dob: '1982-08-25', address: 'Lake City, Sector M-7, Lahore' },
    { name: 'Sidra Tul Ain', phone: '+923001234516', gender: 'female', dob: '1997-01-17', address: 'PIA Housing Scheme, Block C, Lahore' },
    { name: 'Saad Rafiq', phone: '+923001234517', gender: 'male', dob: '1986-09-09', address: 'State Life Housing Society, Phase 1, Lahore' },
    { name: 'Nida Yasir', phone: '+923001234518', gender: 'female', dob: '1983-03-14', address: 'Gulshan-e-Ravi, Block F, Lahore' },
    { name: 'Imran Ashraf', phone: '+923001234519', gender: 'male', dob: '1990-12-21', address: 'Samanabad, Main Road, Lahore' },
    { name: 'Mahnoor Baloch', phone: '+923001234520', gender: 'female', dob: '1998-05-07', address: 'Allama Iqbal Town, Ravi Block, Lahore' },
    { name: 'Asad Ullah', phone: '+923001234521', gender: 'male', dob: '1978-02-28', address: 'EME Sector, DHA Phase 12, Lahore' },
    { name: 'Mehwish Hayat', phone: '+923001234522', gender: 'female', dob: '1993-07-04', address: 'Sui Gas Society Phase 2, Lahore' },
    { name: 'Farhan Saeed', phone: '+923001234523', gender: 'male', dob: '1985-04-19', address: 'Eden Avenue, Airport Road, Lahore' },
    { name: 'Urwa Hocane', phone: '+923001234524', gender: 'female', dob: '1991-10-31', address: 'New Garden Town, Aibak Block, Lahore' },
    { name: 'Danish Taimoor', phone: '+923001234525', gender: 'male', dob: '1981-06-16', address: 'DHA Phase 6, Sector L, Lahore' },
    { name: 'Ayeza Khan', phone: '+923001234526', gender: 'female', dob: '1994-01-26', address: 'DHA Phase 8, Ex-Air Avenue, Lahore' },
    { name: 'Fahad Mustafa', phone: '+923001234527', gender: 'male', dob: '1983-09-12', address: 'Askari 11, Sector B, Lahore' },
    { name: 'Iqra Aziz', phone: '+923001234528', gender: 'female', dob: '1997-11-24', address: 'Township, Sector A-2, Lahore' },
    { name: 'Yasir Hussain', phone: '+923001234529', gender: 'male', dob: '1984-07-08', address: 'Sabzazar Scheme, Block G, Lahore' },
    { name: 'Sarah Khan', phone: '+923001234530', gender: 'female', dob: '1992-08-01', address: 'Wapda Town Phase 2, Block D, Lahore' },
  ];

  const defaultPatientPasswordHash = bcrypt.hashSync('DevPassword123!', 10);

  const seededPatients = await db
    .insert(patients)
    .values(
      pakistaniPatientsData.map((p, idx) => {
        const firstName = p.name.split(' ')[0]!.toLowerCase();
        const isMuhammadUsman = p.phone === '+923001234501';

        const email = isMuhammadUsman
          ? 'muhammad@brightsmile.com'
          : `${firstName}@brightsmile.com`;

        const cnic = isMuhammadUsman
          ? '35202-1234567-1'
          : `3520${(idx % 9) + 1}-${String(1000000 + (idx + 1) * 23456).slice(0, 7)}-1`;

        const birthYear = parseInt(p.dob.split('-')[0]!, 10);
        const age = isMuhammadUsman ? 36 : Math.max(1, new Date().getFullYear() - birthYear);

        return {
          clinicId,
          fullName: p.name,
          phone: p.phone,
          email,
          passwordHash: defaultPatientPasswordHash,
          cnic,
          age,
          dob: p.dob,
          gender: p.gender,
          address: p.address,
          notes: 'Routine dental consultation record',
        };
      })
    )
    .returning();
  console.log(`    ✅ Inserted ${seededPatients.length} patients with email/password auth`);


  // 4. Consents (100% data_processing, ~70% reminders, ~40% marketing)
  console.log('  [5/9] Generating patient compliance consents...');
  const consentsToInsert: Array<typeof consents.$inferInsert> = [];

  seededPatients.forEach((patient, idx) => {
    // 100% data_processing
    consentsToInsert.push({
      clinicId,
      patientId: patient.id,
      type: 'data_processing',
      version: 'v1.0-2026',
      ip: '110.39.42.18',
      textSnapshot:
        'Patient consented to dental health records storage, clinical processing, and diagnostic imagery under Pakistan Personal Data Protection guidelines.',
    });

    // ~70% reminders (indices divisible by not 3 or 4)
    if (idx % 10 < 7) {
      consentsToInsert.push({
        clinicId,
        patientId: patient.id,
        type: 'reminders',
        version: 'v1.0-2026',
        ip: '110.39.42.18',
        textSnapshot:
          'Patient opted in for automated WhatsApp and SMS appointment confirmations, pre-procedure alerts, and hygiene recalls.',
      });
    }

    // ~40% marketing (indices 0, 1, 2, 3 in each 10)
    if (idx % 10 < 4) {
      consentsToInsert.push({
        clinicId,
        patientId: patient.id,
        type: 'marketing',
        version: 'v1.0-2026',
        ip: '110.39.42.18',
        textSnapshot:
          'Patient opted in to receive seasonal oral wellness promotions, teeth whitening campaigns, and clinic newsletter.',
      });
    }
  });

  const seededConsents = await db.insert(consents).values(consentsToInsert).returning();
  console.log(`    ✅ Inserted ${seededConsents.length} consent records`);

  // 5. Appointments (60 appointments across ±30 days)
  console.log('  [6/9] Generating 60 appointments across ±30 days...');
  const now = new Date();
  const appointmentsToInsert: Array<typeof appointments.$inferInsert> = [];

  const appointmentReasons = [
    'Comprehensive Oral Examination & Scaling',
    'Persistent Toothache on Upper Right Molar',
    'Routine Dental Checkup & Polishing',
    'Root Canal Therapy Session 2',
    'Composite Filling for Occlusal Caries',
    'Crown Prep & Digital Impression',
    'Wisdom Tooth Pain Evaluation',
    'Orthodontic Bracket Adjustment',
    'Bleeding Gums & Deep Scaling',
    'Post-Op Follow-up & Suture Removal',
  ];

  // Distribute 60 appointments across 30 patients (2 each)
  for (let i = 0; i < 60; i++) {
    const patient = seededPatients[i % seededPatients.length]!;
    const dentist = i % 2 === 0 ? dentistUser : ownerDentist;

    // Day offset from -28 to +28 days
    const dayOffset = (i % 57) - 28;
    const apptDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    apptDate.setHours(9 + (i % 8), (i % 2) * 30, 0, 0);

    const endDate = new Date(apptDate.getTime() + 45 * 60 * 1000);

    let status: typeof appointments.$inferInsert.status;
    if (dayOffset < -1) {
      // Past appointments: 25 completed, 5 cancelled/no_show
      if (i === 0) status = 'completed';
      else if (i % 6 === 0) status = 'no_show';
      else if (i % 8 === 0) status = 'cancelled';
      else status = 'completed';
    } else if (dayOffset <= 1) {
      status = i % 2 === 0 ? 'arrived' : 'confirmed';
    } else {
      status = i % 3 === 0 ? 'confirmed' : 'scheduled';
    }

    appointmentsToInsert.push({
      clinicId,
      patientId: patient.id,
      dentistId: dentist.id,
      startAt: apptDate,
      endAt: endDate,
      status,
      reason: appointmentReasons[i % appointmentReasons.length],
      notes: `Patient scheduled via omnichannel reception. Assigned to ${dentist.fullName}.`,
    });
  }

  const seededAppointments = await db.insert(appointments).values(appointmentsToInsert).returning();
  console.log(`    ✅ Inserted ${seededAppointments.length} appointments`);

  // 6. Treatments (20 treatments linked to completed appointments)
  console.log('  [7/9] Creating 20 clinical treatments linked to completed appointments...');
  const completedAppts = seededAppointments.filter((a) => a.status === 'completed');
  const procedures = [
    { code: 'D0120', name: 'Periodic Oral Evaluation', fdi: '11', cost: '3500.00' },
    { code: 'D1110', name: 'Prophylaxis Adult Cleaning', fdi: '12', cost: '6000.00' },
    { code: 'D2391', name: 'Resin-based Composite 1 Surface Posterior', fdi: '16', cost: '7500.00' },
    { code: 'D2392', name: 'Resin-based Composite 2 Surfaces Posterior', fdi: '26', cost: '9500.00' },
    { code: 'D3330', name: 'Endodontic Therapy Molar (RCT)', fdi: '36', cost: '28000.00' },
    { code: 'D2750', name: 'Crown Porcelain Fused to High Noble Metal', fdi: '46', cost: '35000.00' },
    { code: 'D7140', name: 'Extraction Erupted Tooth or Exposed Root', fdi: '38', cost: '8000.00' },
    { code: 'D4341', name: 'Periodontal Scaling and Root Planing', fdi: '21', cost: '12000.00' },
    { code: 'D2950', name: 'Core Buildup Including Any Pins', fdi: '47', cost: '6500.00' },
    { code: 'D9110', name: 'Palliative Emergency Treatment of Dental Pain', fdi: '14', cost: '4000.00' },
  ];

  const treatmentsToInsert: Array<typeof treatments.$inferInsert> = [];
  for (let i = 0; i < 20; i++) {
    const appt = completedAppts[i % completedAppts.length]!;
    const proc = procedures[i % procedures.length]!;
    treatmentsToInsert.push({
      clinicId,
      patientId: appt.patientId,
      appointmentId: appt.id,
      toothFdi: proc.fdi,
      procedureCode: proc.code,
      notes: `${proc.name} completed successfully under local anesthesia.`,
      cost: proc.cost,
    });
  }

  const seededTreatments = await db.insert(treatments).values(treatmentsToInsert).returning();
  console.log(`    ✅ Inserted ${seededTreatments.length} treatments`);

  // 7. Invoices & Receipts (10 invoices with matching receipts across paid, partial, and unpaid)
  console.log('  [8/9] Creating 10 invoices with matching receipts...');
  const invoicesToInsert: Array<typeof invoices.$inferInsert> = [];

  const procedureDescriptions = [
    'Comprehensive Oral Examination & Diagnosis',
    'Full Mouth Ultrasonic Scaling & Polishing',
    'Posterior Composite Restoration (Class II)',
    'Digital Bitewing Radiographs (Set of 2)',
    'Root Canal Treatment (Single Canal)',
  ];

  for (let i = 0; i < 10; i++) {
    const appt = completedAppts[i]!;
    const item1Cost = 5000 + (i % 3) * 1500;
    const item2Cost = 3000 + (i % 2) * 1000;
    const subtotalCents = (item1Cost + item2Cost) * 100;
    const taxRate = 5.0; // 5% provincial service tax
    const taxCents = Math.round((subtotalCents * taxRate) / 100);
    const totalCents = subtotalCents + taxCents;

    const totalStr = (totalCents / 100).toFixed(2);
    const subtotalStr = (subtotalCents / 100).toFixed(2);
    const taxStr = (taxCents / 100).toFixed(2);

    let paidStr = totalStr;
    let status = 'paid';

    if (i >= 5 && i < 8) {
      // Partial payment (e.g., paid 50%)
      const paidCents = Math.round(totalCents / 2);
      paidStr = (paidCents / 100).toFixed(2);
      status = 'partial';
    } else if (i >= 8) {
      // Unpaid
      paidStr = '0.00';
      status = 'unpaid';
    }

    invoicesToInsert.push({
      clinicId,
      patientId: appt.patientId,
      appointmentId: appt.id,
      invoiceNumber: `INV-2026-${String(1001 + i).padStart(4, '0')}`,
      items: [
        {
          description: procedureDescriptions[i % procedureDescriptions.length]!,
          amount: (item1Cost).toFixed(2),
          quantity: 1,
          subtotal: (item1Cost).toFixed(2),
        },
        {
          description: procedureDescriptions[(i + 1) % procedureDescriptions.length]!,
          amount: (item2Cost).toFixed(2),
          quantity: 1,
          subtotal: (item2Cost).toFixed(2),
        },
      ],
      subtotal: subtotalStr,
      taxRate: '5.00',
      tax: taxStr,
      total: totalStr,
      paid: paidStr,
      status,
      notes: `Standard dental billing for clinical appointment #${appt.id.slice(0, 8)}`,
      issuedAt: appt.startAt,
    });
  }

  const seededInvoices = await db.insert(invoices).values(invoicesToInsert).returning();

  const paymentMethods = ['cash', 'card', 'bank_transfer', 'easypaisa', 'jazzcash'];
  const receiptsToInsert: Array<typeof receipts.$inferInsert> = [];

  seededInvoices.forEach((inv, idx) => {
    if (parseFloat(inv.paid) > 0) {
      receiptsToInsert.push({
        clinicId,
        invoiceId: inv.id,
        receiptNumber: `RCP-2026-${String(1001 + idx).padStart(4, '0')}`,
        amount: inv.paid,
        method: paymentMethods[idx % paymentMethods.length]!,
        receivedBy: ownerDentist.id,
        storageKey: `receipts/${clinicId}/${inv.id}_rcpt_${Date.now()}.pdf`,
        notes: `Payment receipt processed via ${paymentMethods[idx % paymentMethods.length]}`,
        issuedAt: inv.issuedAt,
        sentVia: idx % 2 === 0 ? 'whatsapp' : 'email',
      });
    }
  });

  const seededReceipts = await db.insert(receipts).values(receiptsToInsert).returning();
  console.log(`    ✅ Inserted ${seededInvoices.length} invoices and ${seededReceipts.length} matching receipts`);

  // 8. Conversations & Messages (15 conversations across all 5 channels, 3-8 messages each)
  console.log('  [9/9] Creating 15 conversations with omnichannel messages & booking requests...');
  const channels: Array<'whatsapp' | 'voice' | 'instagram' | 'facebook' | 'google'> = [
    'whatsapp',
    'voice',
    'instagram',
    'facebook',
    'google',
  ];

  const conversationTemplates = [
    [
      { dir: 'inbound' as const, text: 'AoA, I need an urgent appointment for severe toothache.' },
      { dir: 'outbound' as const, text: 'Walaikum Assalam! Bright Smile Dental here. Dr. Ayesha has a slot today at 4:30 PM. Would that work?' },
      { dir: 'inbound' as const, text: 'Yes please, 4:30 PM is perfect. Please book it.' },
      { dir: 'outbound' as const, text: 'Confirmed! You are scheduled for 4:30 PM today. Our clinic is located at Gulberg III, MM Alam Road.' },
    ],
    [
      { dir: 'inbound' as const, text: 'Hi, what is the charge for full mouth teeth cleaning?' },
      { dir: 'outbound' as const, text: 'Hello! Ultrasonic scaling and polishing is PKR 6,000. Would you like to schedule a consultation?' },
      { dir: 'inbound' as const, text: 'Can I come this Saturday around 11 AM?' },
      { dir: 'outbound' as const, text: 'Saturday at 11:00 AM is reserved for you. We look forward to seeing you.' },
      { dir: 'inbound' as const, text: 'Thank you so much!' },
    ],
    [
      { dir: 'inbound' as const, text: 'Hello, do you provide Invisalign or clear aligners?' },
      { dir: 'outbound' as const, text: 'Hi there! Yes, Dr. Tariq Mahmood is our certified aligner specialist.' },
      { dir: 'inbound' as const, text: 'Great, how long does the initial 3D scan take?' },
      { dir: 'outbound' as const, text: 'The initial 3D intraoral digital scan takes about 20 minutes and is completely painless.' },
      { dir: 'inbound' as const, text: 'Awesome, let me check my work schedule and get back to you.' },
      { dir: 'outbound' as const, text: 'Sure, feel free to message anytime. Have a great day!' },
    ],
  ];

  let totalMessagesInserted = 0;
  for (let c = 0; c < 15; c++) {
    const patient = seededPatients[c % seededPatients.length]!;
    const channel = channels[c % channels.length]!;
    const threadTemplate = conversationTemplates[c % conversationTemplates.length]!;

    const [conv] = await db
      .insert(conversations)
      .values({
        clinicId,
        patientId: patient.id,
        channel,
        externalThreadId: `${channel}_ext_${patient.phone.replace('+', '')}_${c}`,
        status: c === 0 ? 'pending_handoff' : 'open',
        lastMessageAt: new Date(now.getTime() - c * 3600 * 1000),
      })
      .returning();

    const messagesToInsert: Array<typeof messages.$inferInsert> = threadTemplate.map((m, mIdx) => ({
      clinicId,
      conversationId: conv!.id,
      direction: m.dir,
      body: m.text,
      status: 'delivered',
      sentAt: new Date(now.getTime() - (c * 3600 + (threadTemplate.length - mIdx) * 300) * 1000),
    }));

    const insertedMsgs = await db.insert(messages).values(messagesToInsert).returning();
    totalMessagesInserted += insertedMsgs.length;
  }
  console.log(`    ✅ Inserted 15 conversations with ${totalMessagesInserted} total messages`);

  // 9. Booking Requests (4 pending requests from whatsapp/voice)
  console.log('  [+] Creating 4 pending booking requests from WhatsApp & Voice...');
  const bookingRequestsToInsert: Array<typeof bookingRequests.$inferInsert> = [
    {
      clinicId,
      patientId: seededPatients[0]!.id,
      requestedSlotStart: new Date(now.getTime() + 24 * 3600 * 1000),
      requestedSlotEnd: new Date(now.getTime() + 25 * 3600 * 1000),
      reason: 'Urgent wisdom tooth swelling and consultation',
      status: 'pending',
      requestedVia: 'whatsapp',
    },
    {
      clinicId,
      patientId: seededPatients[1]!.id,
      requestedSlotStart: new Date(now.getTime() + 48 * 3600 * 1000),
      requestedSlotEnd: new Date(now.getTime() + 49 * 3600 * 1000),
      reason: 'Routine 6-month preventive checkup and cleaning',
      status: 'pending',
      requestedVia: 'whatsapp',
    },
    {
      clinicId,
      patientId: seededPatients[2]!.id,
      requestedSlotStart: new Date(now.getTime() + 72 * 3600 * 1000),
      requestedSlotEnd: new Date(now.getTime() + 73 * 3600 * 1000),
      reason: 'Dislodged crown on lower right premolar',
      status: 'pending',
      requestedVia: 'voice',
    },
    {
      clinicId,
      patientId: null,
      patientPhone: '+923001234567',
      patientName: 'Ayesha Khan',
      requestedSlotStart: new Date(now.getTime() + 96 * 3600 * 1000),
      requestedSlotEnd: new Date(now.getTime() + 97 * 3600 * 1000),
      reason: 'Teeth whitening consultation for upcoming wedding',
      notes: 'New prospective patient inquiry via WhatsApp, needs triage and patient profile creation',
      status: 'pending',
      requestedVia: 'whatsapp',
    },
  ];

  const seededBookingRequests = await db.insert(bookingRequests).values(bookingRequestsToInsert).returning();
  console.log(`    ✅ Inserted ${seededBookingRequests.length} pending booking requests`);

  // 10. Charting Entries (~10 patients with permanent and pediatric odontogram charts)
  console.log('  [+] Seeding realistic dental charting entries for 10 patients (permanent & pediatric)...');
  const chartingEntriesToInsert: Array<typeof chartingEntries.$inferInsert> = [];

  const addEntry = (
    patientIdx: number,
    toothFdi: string,
    surface: 'mesial' | 'distal' | 'buccal' | 'lingual' | 'occlusal' | 'incisal' | 'whole',
    condition: 'healthy' | 'caries' | 'filled' | 'crown' | 'missing' | 'implant' | 'rct',
    notes: string,
    daysAgo: number,
    dentist: typeof seededUsers[0]
  ) => {
    const patient = seededPatients[patientIdx];
    if (!patient) return;
    chartingEntriesToInsert.push({
      clinicId,
      patientId: patient.id,
      toothFdi,
      surface,
      condition,
      notes,
      recordedBy: dentist!.id,
      recordedAt: new Date(now.getTime() - daysAgo * 24 * 3600 * 1000),
    });
  };

  // Patient 0: Muhammad Usman (Adult)
  addEntry(0, '18', 'whole', 'missing', 'Third molar extracted due to pericoronitis', 90, ownerDentist);
  addEntry(0, '16', 'occlusal', 'caries', 'Incipient occlusal fissure decay noted', 60, dentistUser);
  addEntry(0, '16', 'occlusal', 'filled', 'Class I composite restoration placed shade A3', 30, dentistUser);
  addEntry(0, '26', 'occlusal', 'caries', 'Cavitated pit caries extending into dentin', 14, dentistUser);
  addEntry(0, '36', 'whole', 'rct', 'Endodontic therapy completed; obturated with gutta percha', 45, ownerDentist);
  addEntry(0, '36', 'whole', 'crown', 'Full contour monolithic zirconia crown cemented', 20, ownerDentist);
  addEntry(0, '46', 'mesial', 'filled', 'Class II MO composite restoration', 75, dentistUser);

  // Patient 1: Fatima Zahra (Adult)
  addEntry(1, '11', 'whole', 'crown', 'E-max aesthetic ceramic crown', 120, ownerDentist);
  addEntry(1, '21', 'whole', 'crown', 'E-max aesthetic ceramic crown matching 11', 120, ownerDentist);
  addEntry(1, '14', 'occlusal', 'filled', 'Preventive resin restoration', 40, dentistUser);
  addEntry(1, '24', 'occlusal', 'filled', 'Composite filling shade A2', 40, dentistUser);
  addEntry(1, '47', 'buccal', 'caries', 'Cervical abfraction lesion with secondary decay', 7, dentistUser);

  // Patient 2: Ali Raza (Adult)
  addEntry(2, '38', 'whole', 'missing', 'Surgically extracted horizontal impaction', 180, ownerDentist);
  addEntry(2, '48', 'whole', 'missing', 'Surgically extracted mesioangular impaction', 180, ownerDentist);
  addEntry(2, '46', 'whole', 'implant', 'Straumann SLA bone level implant 4.1x10mm placed', 90, ownerDentist);
  addEntry(2, '46', 'whole', 'crown', 'Screw-retained zirconia crown on titanium base', 15, ownerDentist);
  addEntry(2, '15', 'occlusal', 'caries', 'Class I caries into enamel-dentin junction', 10, dentistUser);

  // Patient 3: Zainab Bibi (Adult)
  addEntry(3, '12', 'lingual', 'caries', 'Cingulum pit caries', 35, dentistUser);
  addEntry(3, '26', 'occlusal', 'caries', 'Deep occlusal fissure caries', 50, dentistUser);
  addEntry(3, '26', 'occlusal', 'filled', 'Composite restoration with glass ionomer base', 25, dentistUser);
  addEntry(3, '26', 'distal', 'filled', 'Distal proximal box restoration', 25, dentistUser);
  addEntry(3, '37', 'occlusal', 'caries', 'Arrested enamel caries, monitor at next recall', 5, dentistUser);

  // Patient 4: Ahmed Hassan (Adult)
  addEntry(4, '16', 'whole', 'rct', 'Three canals negotiated and obturated', 110, ownerDentist);
  addEntry(4, '16', 'whole', 'crown', 'PFM crown seated with resin cement', 95, ownerDentist);
  addEntry(4, '28', 'whole', 'missing', 'Extracted', 150, ownerDentist);
  addEntry(4, '36', 'whole', 'missing', 'Non-restorable fractured tooth extracted', 80, ownerDentist);
  addEntry(4, '36', 'whole', 'implant', 'Implant fixture placed with 35N torque', 30, ownerDentist);
  addEntry(4, '44', 'buccal', 'filled', 'Class V composite cervical restoration', 12, dentistUser);

  // Patient 5: Maryam Nawaz (Adult)
  addEntry(5, '11', 'incisal', 'filled', 'Class IV fractured incisal angle restored shade B1', 65, ownerDentist);
  addEntry(5, '21', 'whole', 'healthy', 'Intact vitality confirmed with pulp test', 65, ownerDentist);
  addEntry(5, '36', 'occlusal', 'filled', 'Composite restoration shade A2', 45, dentistUser);
  addEntry(5, '46', 'occlusal', 'filled', 'Composite restoration shade A2', 45, dentistUser);

  // Patient 6: Hamza Tariq (Adult)
  addEntry(6, '17', 'occlusal', 'caries', 'Occlusal decay with cold sensitivity', 22, dentistUser);
  addEntry(6, '27', 'occlusal', 'caries', 'Incipient fissure staining and softening', 22, dentistUser);
  addEntry(6, '37', 'occlusal', 'filled', 'Nanohybrid composite restoration', 55, dentistUser);
  addEntry(6, '47', 'occlusal', 'filled', 'Nanohybrid composite restoration', 55, dentistUser);

  // Patient 7: Ayesha Siddiqua (Adult)
  addEntry(7, '15', 'mesial', 'caries', 'Interproximal caries on bite-wing radiograph', 18, dentistUser);
  addEntry(7, '15', 'occlusal', 'caries', 'Occlusal extension of proximal caries', 18, dentistUser);
  addEntry(7, '25', 'whole', 'healthy', 'Normal clinical anatomy and vitality', 18, dentistUser);
  addEntry(7, '34', 'whole', 'healthy', 'Healthy intact bicuspid', 18, dentistUser);

  // Patient 8: Bilal Siddiqui (Adult)
  addEntry(8, '16', 'mesial', 'filled', 'MO amalgam replaced with composite', 70, dentistUser);
  addEntry(8, '16', 'occlusal', 'filled', 'Occlusal surface restored', 70, dentistUser);
  addEntry(8, '26', 'occlusal', 'caries', 'Active fissure cavitation', 8, dentistUser);
  addEntry(8, '46', 'whole', 'rct', 'Endodontic therapy completed in two visits', 40, ownerDentist);

  // Patient 9: Sana Javed (Pediatric - Age 9, Primary & Mixed Dentition)
  addEntry(9, '55', 'occlusal', 'caries', 'Primary second molar deep pit decay', 30, dentistUser);
  addEntry(9, '54', 'occlusal', 'filled', 'Primary first molar composite resin filling', 45, dentistUser);
  addEntry(9, '65', 'occlusal', 'caries', 'Primary upper left second molar caries', 15, dentistUser);
  addEntry(9, '75', 'occlusal', 'filled', 'Compomer restoration', 60, dentistUser);
  addEntry(9, '85', 'whole', 'rct', 'Pulpotomy completed with ferric sulfate', 40, ownerDentist);
  addEntry(9, '85', 'whole', 'crown', 'Preformed stainless steel crown placed', 40, ownerDentist);
  addEntry(9, '71', 'whole', 'missing', 'Physiologic exfoliation of primary central incisor', 90, dentistUser);
  addEntry(9, '81', 'whole', 'missing', 'Physiologic exfoliation of primary central incisor', 90, dentistUser);

  const seededChartingEntries = await db
    .insert(chartingEntries)
    .values(chartingEntriesToInsert)
    .returning();
  console.log(`    ✅ Inserted ${seededChartingEntries.length} charting entries across 10 patients`);

  // Summary
  console.log('\n======================================================');
  console.log('🎉 SEED SUMMARY:');
  console.log(`  - Clinics: 1 (${clinic.name})`);
  console.log(`  - Users: ${seededUsers.length}`);
  console.log(`  - Patients: ${seededPatients.length}`);
  console.log(`  - Consents: ${seededConsents.length}`);
  console.log(`  - Appointments: ${seededAppointments.length}`);
  console.log(`  - Treatments: ${seededTreatments.length}`);
  console.log(`  - Invoices: ${seededInvoices.length}`);
  console.log(`  - Receipts: ${seededReceipts.length}`);
  console.log(`  - Conversations: 15 (${totalMessagesInserted} messages)`);
  console.log(`  - Booking Requests: ${seededBookingRequests.length} (pending)`);
  console.log(`  - Charting Entries: ${seededChartingEntries.length} across 10 patients`);
  console.log('======================================================\n');

  console.log('📋 DEMO PATIENT LOGINS (Password: DevPassword123!):');
  seededPatients.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.fullName} -> Email: ${p.email} | CNIC: ${p.cnic} | Phone: ${p.phone} | Age: ${p.age}`);
  });


  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
