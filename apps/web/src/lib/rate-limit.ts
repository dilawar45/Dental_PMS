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
 * Helper: Rate limits OTP send requests by phone number.
 * Rule: Max 3 requests per phone per 15 minutes (900s).
 */
export async function checkSendOtpRateLimit(phone: string): Promise<RateLimitResult> {
  return checkRateLimit(`send_otp:${phone}`, 3, 15 * 60);
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
