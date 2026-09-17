import crypto from 'node:crypto';

/**
 * Verify Meta's X-Hub-Signature-256 header using SHA-256 HMAC of raw payload.
 *
 * In dev/mock mode, signature verification is bypassed if the header is not provided.
 * In production/real mode, signature verification is strictly enforced.
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string | undefined,
  providerMode: string | undefined = process.env['WHATSAPP_PROVIDER']
): boolean {
  const isMockMode = providerMode !== 'real' && providerMode !== 'meta';

  // Allow bypassing signature check in mock mode when signature header is not passed
  if (isMockMode && !signatureHeader) {
    return true;
  }

  if (!signatureHeader || !appSecret) {
    return false;
  }

  const parts = signatureHeader.split('=');
  if (parts.length !== 2 || parts[0] !== 'sha256' || !parts[1]) {
    return false;
  }

  const providedHex = parts[1];
  const hmac = crypto.createHmac('sha256', appSecret);
  hmac.update(rawBody, 'utf8');
  const expectedHex = hmac.digest('hex');

  try {
    const providedBuf = Buffer.from(providedHex, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length !== expectedBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(providedBuf, expectedBuf);
  } catch {
    return false;
  }
}
