# Patient REST API Reference (Mobile App)

The Patient REST API provides endpoints for the React Native / Expo mobile application. It enables patients to authenticate via phone OTP, view available dentists and appointment calendar slots, submit booking requests, review treatment and charting records, download payment receipts, manage push notification tokens, and converse with the AI receptionist.

---

## Architectural Principles

### 1. Dual-Layer Authentication: JWT vs Supabase Auth
The system maintains a strict separation of concerns across two authentication domains:
- **Staff / Clinic Users**: Authenticate through **Supabase Auth** (`auth.users`), with sessions managed by cookies and Supabase SSR middleware.
- **Patients**: Authenticate against the **Patient REST API** using a custom **HMAC-SHA256 JWT** issued upon successful OTP verification.
  - **Why not Supabase Auth for patients?**
    1. **Identity Segregation**: Staff users have dashboard access, role-based capabilities (`dentist`, `receptionist`, `owner`), and administrative permissions. Patients are consumer entities without backend dashboard rights.
    2. **Frictionless Onboarding**: Patients authenticate via SMS OTP without passwords or email verification flows.
    3. **Multi-Tenant Isolation**: The patient JWT payload contains `{ patient_id, clinic_id, iat, exp }`. Every database query in the REST API executes within `withClinic(clinic_id)` derived directly from the verified JWT. Clients cannot spoof `clinic_id` in request payloads.
    4. **Credential Swappability**: The OTP authentication model can be migrated to passwords or biometric assertions in the future simply by updating `/api/patient/auth/*` without touching clinical, billing, or scheduling endpoints.

### 2. Tenant Isolation & Row-Level Security (RLS)
Every request:
1. Validates the `Authorization: Bearer <patient_jwt>` header.
2. Derives `clinic_id` and `patient_id` from the cryptographically verified token.
3. Wraps all database operations in `withClinic(clinic_id)`, ensuring PostgreSQL Row-Level Security (RLS) policies filter out all rows belonging to other clinics.

### 3. Rate Limiting
- **`POST /api/patient/auth/send-otp`**: Maximum 3 OTP send requests per phone number per 15 minutes. Returns HTTP `429 Too Many Requests` when exceeded.
- **`POST /api/patient/auth/verify-otp`**: Maximum 5 failed verification attempts per OTP code before the record is permanently invalidated.
- **`POST /api/patient/chat`**: Maximum 30 messages per patient per hour.

### 4. CORS
- **Development**: Permissive origin (`*`) allowing Expo development servers and local mobile simulators.
- **Production**: Restricted to origins declared in `PATIENT_API_ALLOWED_ORIGINS` (comma-separated list).

---

## Endpoint Reference

| Method | Path | Auth | Request Body | Response (Success) |
|---|---|---|---|---|
| `POST` | `/api/patient/auth/send-otp` | Public | `{ phone: string, clinic_id: string }` | `{ success: true, dev_code?: string }` |
| `POST` | `/api/patient/auth/verify-otp` | Public | `{ phone: string, code: string, clinic_id: string }` | `{ token: string, patient: { id, full_name, phone } }` |
| `GET` | `/api/patient/me` | Bearer JWT | None | `{ id, full_name, phone, email, dob, gender, preferred_language, clinic_id }` |
| `PATCH` | `/api/patient/me` | Bearer JWT | `{ full_name?, email?, address?, preferred_language? }` | `{ id, full_name, phone, email, dob, gender, address, preferred_language, clinic_id }` |
| `GET` | `/api/patient/clinic` | Bearer JWT | None | `{ id, name, address, phone, timezone, hours }` |
| `GET` | `/api/patient/doctors` | Bearer JWT | None | `{ doctors: [{ id, full_name, role, fee, fee_currency, weekly_schedule }] }` |
| `GET` | `/api/patient/availability` | Bearer JWT | None (`?date=YYYY-MM-DD&dentist_id=UUID`) | `{ date: string, available_slots: [{ start, end, start_at, end_at, dentist_id, dentist_name }] }` |
| `POST` | `/api/patient/bookings` | Bearer JWT | `{ slot_start: string, slot_end: string, dentist_id?: string, reason: string, notes?: string }` | `{ booking_request_id: string, status: "pending", message: string }` |
| `GET` | `/api/patient/appointments` | Bearer JWT | None (`?status=upcoming\|past\|all`) | `{ appointments: [{ id, dentist_id, dentist_name, status, start_at, end_at, reason, notes }] }` |
| `GET` | `/api/patient/treatments` | Bearer JWT | None | `{ treatments: [{ id, procedure_code, tooth_fdi, cost, notes, created_at }] }` |
| `GET` | `/api/patient/chart` | Bearer JWT | None | `{ teeth: { [tooth_fdi]: { tooth_fdi, whole_condition, surfaces, notes } } }` |
| `GET` | `/api/patient/invoices` | Bearer JWT | None | `{ invoices: [{ id, invoice_number, items, total, paid, balance, status, issued_at }] }` |
| `GET` | `/api/patient/receipts/:id` | Bearer JWT | None | `{ id, receipt_number, amount, url }` |
| `POST` | `/api/patient/chat` | Bearer JWT | `{ body: string }` | `{ reply: string, tool_intents: string[] }` |
| `POST` | `/api/patient/devices` | Bearer JWT | `{ fcm_token: string, platform: "android" \| "ios" }` | `{ success: true, device: { id, platform, last_seen_at } }` |
| `DELETE` | `/api/patient/devices/:id` | Bearer JWT | None | `{ success: true }` |

---

## Detailed Endpoint Examples (`curl`)

### 1. Send OTP
```bash
curl -X POST http://localhost:3000/api/patient/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+923001234501",
    "clinic_id": "b398700a-f746-4a45-afc0-b1020cda02a8"
  }'
```
**Response:**
```json
{
  "success": true,
  "dev_code": "819203"
}
```

### 2. Verify OTP
```bash
curl -X POST http://localhost:3000/api/patient/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+923001234501",
    "code": "819203",
    "clinic_id": "b398700a-f746-4a45-afc0-b1020cda02a8"
  }'
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXRpZW50X2lkIjoiY2E0...",
  "patient": {
    "id": "ca4059ee-c923-4556-9ff5-1a8c3d9a7123",
    "full_name": "Tariq Mahmood",
    "phone": "+923001234501"
  }
}
```

### 3. Get Patient Profile (`/me`)
```bash
curl -X GET http://localhost:3000/api/patient/me \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "id": "ca4059ee-c923-4556-9ff5-1a8c3d9a7123",
  "full_name": "Tariq Mahmood",
  "phone": "+923001234501",
  "email": "tariq@example.com",
  "dob": "1988-04-12",
  "gender": "male",
  "preferred_language": "en",
  "clinic_id": "b398700a-f746-4a45-afc0-b1020cda02a8"
}
```

### 4. Update Profile (`PATCH /me`)
```bash
curl -X PATCH http://localhost:3000/api/patient/me \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "preferred_language": "ur",
    "address": "House 14, Street 9, F-7/2, Islamabad"
  }'
```

### 5. Get Clinic Information
```bash
curl -X GET http://localhost:3000/api/patient/clinic \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "id": "b398700a-f746-4a45-afc0-b1020cda02a8",
  "name": "Bright Smile Dental Clinic",
  "address": "Plaza 45, Sector F-8 Markaz, Islamabad",
  "phone": "+92-51-2856789",
  "timezone": "Asia/Karachi",
  "hours": "Mon-Sat 09:00-19:00"
}
```

### 6. Get Available Doctors
```bash
curl -X GET http://localhost:3000/api/patient/doctors \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "doctors": [
    {
      "id": "18f9e66d-5d93-41ea-bfcf-e2832beea7ec",
      "full_name": "Dr. Sarah Khan",
      "role": "owner",
      "fee": 2000,
      "fee_currency": "PKR",
      "weekly_schedule": "Mon-Sat 09:00-19:00"
    }
  ]
}
```

### 7. Query Calendar Availability Slots
```bash
curl -X GET "http://localhost:3000/api/patient/availability?date=2026-09-25" \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "date": "2026-09-25",
  "available_slots": [
    {
      "start": "2026-09-25T04:00:00.000Z",
      "end": "2026-09-25T04:30:00.000Z",
      "start_at": "2026-09-25T04:00:00.000Z",
      "end_at": "2026-09-25T04:30:00.000Z",
      "dentist_id": "18f9e66d-5d93-41ea-bfcf-e2832beea7ec",
      "dentist_name": "Dr. Sarah Khan"
    }
  ]
}
```

### 8. Submit Appointment Booking Request
```bash
curl -X POST http://localhost:3000/api/patient/bookings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "slot_start": "2026-09-25T04:00:00.000Z",
    "slot_end": "2026-09-25T04:30:00.000Z",
    "dentist_id": "18f9e66d-5d93-41ea-bfcf-e2832beea7ec",
    "reason": "Severe lower molar sensitivity and routine checkup",
    "notes": "Prefer morning appointment if possible"
  }'
```
**Response:**
```json
{
  "booking_request_id": "8f8373b9-c923-4556-9ff5-1a8c3d9a7442",
  "status": "pending",
  "message": "Booking request received. Our clinic staff will review and confirm your appointment."
}
```

### 9. Get Patient Appointments
```bash
curl -X GET "http://localhost:3000/api/patient/appointments?status=upcoming" \
  -H "Authorization: Bearer <TOKEN>"
```

### 10. Get Treatment History
```bash
curl -X GET http://localhost:3000/api/patient/treatments \
  -H "Authorization: Bearer <TOKEN>"
```

### 11. Get Dental Chart Odontogram
```bash
curl -X GET http://localhost:3000/api/patient/chart \
  -H "Authorization: Bearer <TOKEN>"
```

### 12. Get Patient Invoices
```bash
curl -X GET http://localhost:3000/api/patient/invoices \
  -H "Authorization: Bearer <TOKEN>"
```

### 13. Download Receipt PDF
```bash
curl -X GET http://localhost:3000/api/patient/receipts/02c34919-ff6d-495c-9411-bd388e6307fa \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "id": "02c34919-ff6d-495c-9411-bd388e6307fa",
  "receipt_number": "REC-2026-0001",
  "amount": "4500.00",
  "url": "mock://storage/receipts/receipt_02c34919.pdf?signed=true"
}
```

### 14. Chat with AI Receptionist
```bash
curl -X POST http://localhost:3000/api/patient/chat \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Hi, what time are you open tomorrow for cleaning?"
  }'
```
**Response:**
```json
{
  "reply": "Hello! We are open Monday to Saturday from 09:00 to 19:00. Would you like me to check available slots for your teeth cleaning tomorrow?",
  "tool_intents": ["check_availability"]
}
```

### 15. Register Push Device Token
```bash
curl -X POST http://localhost:3000/api/patient/devices \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "fcm_token": "fcm_test_token_abc123_xyz789",
    "platform": "android"
  }'
```
**Response:**
```json
{
  "success": true,
  "device": {
    "id": "e9314ca2-6ef0-449e-873b-eb6db9cb16b9",
    "platform": "android",
    "last_seen_at": "2026-09-21T01:00:00.000Z"
  }
}
```

### 16. Remove Push Device Token (Logout)
```bash
curl -X DELETE http://localhost:3000/api/patient/devices/e9314ca2-6ef0-449e-873b-eb6db9cb16b9 \
  -H "Authorization: Bearer <TOKEN>"
```
**Response:**
```json
{
  "success": true
}
```
