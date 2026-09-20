import { POST as sendOtp } from '../src/app/api/patient/auth/send-otp/route';
import { POST as verifyOtp } from '../src/app/api/patient/auth/verify-otp/route';
import { GET as getMe } from '../src/app/api/patient/me/route';
import { GET as getDoctors } from '../src/app/api/patient/doctors/route';
import { GET as getAvailability } from '../src/app/api/patient/availability/route';
import { POST as createBooking } from '../src/app/api/patient/bookings/route';
import { GET as getAppointments } from '../src/app/api/patient/appointments/route';
import { POST as postChat } from '../src/app/api/patient/chat/route';
import { getDefaultDb, schema } from '@dental-pms/db';
import { eq } from 'drizzle-orm';

async function run() {
  const db = getDefaultDb();

  // Pick an existing seeded patient from the seeded clinic
  const targetClinicId = 'b398700a-f746-4a45-afc0-b1020cda02a8';
  let [patient] = await db
    .select()
    .from(schema.patients)
    .where(eq(schema.patients.clinicId, targetClinicId))
    .limit(1);

  if (!patient) {
    [patient] = await db.select().from(schema.patients).limit(1);
  }
  if (!patient) {
    console.error('No patient found');
    process.exit(1);
  }

  const phone = patient.phone;
  const clinicId = patient.clinicId;

  console.log('=== DEMO CURL EXECUTION START ===\n');

  // 1. send-otp
  console.log('1. POST /api/patient/auth/send-otp');
  console.log(`curl -X POST http://localhost:3000/api/patient/auth/send-otp \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"phone": "${phone}", "clinic_id": "${clinicId}"}'`);

  const req1 = new Request('http://localhost:3000/api/patient/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, clinic_id: clinicId }),
  });
  const res1 = await sendOtp(req1);
  const data1 = await res1.json();
  console.log('HTTP Status:', res1.status);
  console.log('Response:', JSON.stringify(data1, null, 2));
  console.log('\n----------------------------------------\n');

  const devCode = data1.dev_code || '123456';

  // 2. verify-otp
  console.log('2. POST /api/patient/auth/verify-otp');
  console.log(`curl -X POST http://localhost:3000/api/patient/auth/verify-otp \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"phone": "${phone}", "code": "${devCode}", "clinic_id": "${clinicId}"}'`);

  const req2 = new Request('http://localhost:3000/api/patient/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code: devCode, clinic_id: clinicId }),
  });
  const res2 = await verifyOtp(req2);
  const data2 = await res2.json();
  console.log('HTTP Status:', res2.status);
  console.log('Response:', JSON.stringify(data2, null, 2));
  console.log('\n----------------------------------------\n');

  const token = data2.token;

  // 3. GET /me
  console.log('3. GET /api/patient/me');
  console.log(`curl -X GET http://localhost:3000/api/patient/me \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);

  const req3 = new Request('http://localhost:3000/api/patient/me', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const res3 = await getMe(req3);
  const data3 = await res3.json();
  console.log('HTTP Status:', res3.status);
  console.log('Response:', JSON.stringify(data3, null, 2));
  console.log('\n----------------------------------------\n');

  // 4. GET /doctors
  console.log('4. GET /api/patient/doctors');
  console.log(`curl -X GET http://localhost:3000/api/patient/doctors \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);

  const req4 = new Request('http://localhost:3000/api/patient/doctors', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const res4 = await getDoctors(req4);
  const data4 = await res4.json();
  console.log('HTTP Status:', res4.status);
  console.log('Response:', JSON.stringify(data4, null, 2));
  console.log('\n----------------------------------------\n');

  const doctorId = data4.doctors?.[0]?.id;

  // 5. GET /availability?date=...
  const dateStr = '2026-10-10';
  console.log(`5. GET /api/patient/availability?date=${dateStr}`);
  console.log(`curl -X GET "http://localhost:3000/api/patient/availability?date=${dateStr}" \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);

  const req5 = new Request(`http://localhost:3000/api/patient/availability?date=${dateStr}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const res5 = await getAvailability(req5);
  const data5 = await res5.json();
  console.log('HTTP Status:', res5.status);
  console.log('Response:', JSON.stringify({
    date: data5.date,
    available_slots: (data5.available_slots || []).slice(0, 3), // truncate for preview
    total_slots: (data5.available_slots || []).length,
  }, null, 2));
  console.log('\n----------------------------------------\n');

  // 6. POST /bookings
  console.log('6. POST /api/patient/bookings');
  console.log(`curl -X POST http://localhost:3000/api/patient/bookings \\`);
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"slot_start": "2026-10-10T04:00:00.000Z", "slot_end": "2026-10-10T04:30:00.000Z", "dentist_id": "${doctorId || ''}", "reason": "Tooth cleaning and checkup"}'`);

  const req6 = new Request('http://localhost:3000/api/patient/bookings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      slot_start: '2026-10-10T04:00:00.000Z',
      slot_end: '2026-10-10T04:30:00.000Z',
      dentist_id: doctorId,
      reason: 'Tooth cleaning and checkup',
      notes: 'Morning appointment preferred',
    }),
  });
  const res6 = await createBooking(req6);
  const data6 = await res6.json();
  console.log('HTTP Status:', res6.status);
  console.log('Response:', JSON.stringify(data6, null, 2));
  console.log('\n----------------------------------------\n');

  // 7. GET /appointments
  console.log('7. GET /api/patient/appointments');
  console.log(`curl -X GET http://localhost:3000/api/patient/appointments \\`);
  console.log(`  -H "Authorization: Bearer ${token}"`);

  const req7 = new Request('http://localhost:3000/api/patient/appointments', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
  const res7 = await getAppointments(req7);
  const data7 = await res7.json();
  console.log('HTTP Status:', res7.status);
  console.log('Response:', JSON.stringify(data7, null, 2));
  console.log('\n----------------------------------------\n');

  // 8. POST /chat
  console.log('8. POST /api/patient/chat');
  console.log(`curl -X POST http://localhost:3000/api/patient/chat \\`);
  console.log(`  -H "Authorization: Bearer ${token}" \\`);
  console.log(`  -H "Content-Type: application/json" \\`);
  console.log(`  -d '{"body": "Hello, I would like to inquire about teeth whitening fees"}'`);

  const req8 = new Request('http://localhost:3000/api/patient/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: 'Hello, I would like to inquire about teeth whitening fees',
    }),
  });
  const res8 = await postChat(req8);
  const data8 = await res8.json();
  console.log('HTTP Status:', res8.status);
  console.log('Response:', JSON.stringify(data8, null, 2));
  console.log('\n=== DEMO CURL EXECUTION COMPLETE ===\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('Demo error:', err);
  process.exit(1);
});
