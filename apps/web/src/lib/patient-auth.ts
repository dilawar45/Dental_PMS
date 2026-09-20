import crypto from 'node:crypto';

export interface PatientTokenPayload {
  patient_id: string;
  clinic_id: string;
  iat: number;
  exp: number;
}

export class PatientAuthError extends Error {
  readonly status = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'PatientAuthError';
  }
}

export function getPatientJwtSecret(): string {
  return (
    process.env['PATIENT_JWT_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    'patient-secret-key-32-chars-minimum-dental-pms-default'
  );
}

/**
 * Signs a 30-day JWT for a patient authenticated via OTP.
 */
export function signPatientToken(
  patientId: string,
  clinicId: string,
  secret = getPatientJwtSecret()
): string {
  const now = Math.floor(Date.now() / 1000);
  const thirtyDaysInSeconds = 30 * 24 * 60 * 60;

  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload: PatientTokenPayload = {
    patient_id: patientId,
    clinic_id: clinicId,
    iat: now,
    exp: now + thirtyDaysInSeconds,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifies a patient JWT token signature and expiration.
 * Returns { patient_id, clinic_id } on success, or null if invalid or expired.
 */
export function verifyPatientToken(
  token: string | null | undefined,
  secret = getPatientJwtSecret()
): { patient_id: string; clinic_id: string } | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    return null;
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const payloadJson = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
    const payload = JSON.parse(payloadJson) as PatientTokenPayload;

    if (!payload.patient_id || !payload.clinic_id || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return null; // Expired
    }

    return {
      patient_id: payload.patient_id,
      clinic_id: payload.clinic_id,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies the patient JWT from the Authorization: Bearer <token> header.
 */
export function getPatientFromRequest(
  req: Request
): { patient_id: string; clinic_id: string } | null {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  return verifyPatientToken(token);
}

/**
 * Route guard: throws PatientAuthError (401) if request does not contain a valid patient token.
 */
export function requirePatient(req: Request): { patient_id: string; clinic_id: string } {
  const patient = getPatientFromRequest(req);
  if (!patient) {
    throw new PatientAuthError('Missing or invalid patient authorization token');
  }
  return patient;
}
