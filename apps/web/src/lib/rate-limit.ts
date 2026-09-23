interface RateLimitRecord {
  timestamps: number[];
}

const memoryStore = new Map<string, RateLimitRecord>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Checks a sliding window rate limit for a specific key.
 * If allowed, records the current timestamp and returns remaining budget.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const threshold = now - windowMs;

  const record = memoryStore.get(key) || { timestamps: [] };

  // Filter out timestamps older than the sliding window
  const activeTimestamps = record.timestamps.filter((ts) => ts > threshold);

  if (activeTimestamps.length >= limit) {
    const oldest = activeTimestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  activeTimestamps.push(now);
  memoryStore.set(key, { timestamps: activeTimestamps });

  return {
    allowed: true,
    remaining: limit - activeTimestamps.length,
    resetSeconds: windowSeconds,
  };
}

/**
 * Helper: Rate limits patient login attempts by email on failure.
 * Rule: Max 5 failed attempts per email per 15 minutes (900s).
 */
export async function checkPatientLoginRateLimit(email: string): Promise<RateLimitResult> {
  const normalizedEmail = email.trim().toLowerCase();
  const key = `patient_login_failed:${normalizedEmail}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const threshold = now - windowMs;

  const record = memoryStore.get(key) || { timestamps: [] };
  const activeTimestamps = record.timestamps.filter((ts) => ts > threshold);

  if (activeTimestamps.length >= 5) {
    const oldest = activeTimestamps[0] || now;
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  return {
    allowed: true,
    remaining: 5 - activeTimestamps.length,
    resetSeconds: 15 * 60,
  };
}

export function recordPatientFailedLogin(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  const key = `patient_login_failed:${normalizedEmail}`;
  const record = memoryStore.get(key) || { timestamps: [] };
  record.timestamps.push(Date.now());
  memoryStore.set(key, record);
}

export function clearPatientFailedLogin(email: string): void {
  const normalizedEmail = email.trim().toLowerCase();
  memoryStore.delete(`patient_login_failed:${normalizedEmail}`);
}

/**
 * Helper: Rate limits patient forgot password requests by CNIC.
 * Rule: Max 3 requests per CNIC per hour (3600s).
 */
export async function checkPatientForgotPasswordRateLimit(cnic: string): Promise<RateLimitResult> {
  const normalizedCnic = cnic.trim();
  return checkRateLimit(`patient_forgot_pw:${normalizedCnic}`, 3, 60 * 60);
}

/**
 * Helper: Rate limits patient chat messages.
 * Rule: Max 30 messages per patient per hour (3600s).
 */
export async function checkPatientChatRateLimit(patientId: string): Promise<RateLimitResult> {
  const limit = parseInt(process.env['PATIENT_CHAT_RATE_LIMIT'] || '30', 10);
  return checkRateLimit(`patient_chat:${patientId}`, limit, 60 * 60);
}

/**
 * Test helper: resets memory store for testing.

 */
export function resetRateLimits(): void {
  memoryStore.clear();
}

