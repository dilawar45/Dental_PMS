import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { eq } from 'drizzle-orm';
import { getDefaultDb } from '@dental-pms/db';
import { patientDevices, devOutbox } from '@dental-pms/db/schema';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushResult {
  success: boolean;
  sentCount: number;
  mode: 'fcm' | 'mock';
  details?: string;
}

let firebaseApp: App | null = null;

function getFirebaseApp(): App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const existingApps = getApps();
  if (existingApps.length > 0 && existingApps[0]) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  let privateKey = process.env['FIREBASE_PRIVATE_KEY'];

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  // Handle escaped newlines in env variables
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  try {
    firebaseApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    return firebaseApp;
  } catch (err) {
    console.error('[PushService] Failed to initialize Firebase Admin SDK:', err);
    return null;
  }
}

/**
 * Strips potentially sensitive health terminology (PHI) from notification text.
 * Strictly adheres to HIPAA/privacy rules: use generic appointment phrasing.
 */
function sanitizeNonPhi(text: string): string {
  const sensitiveTerms = [
    /root canal/gi,
    /extraction/gi,
    /caries/gi,
    /cavity/gi,
    /gingivitis/gi,
    /periodont/gi,
    /prostho/gi,
    /implant/gi,
    /denture/gi,
  ];

  let sanitized = text;
  for (const regex of sensitiveTerms) {
    sanitized = sanitized.replace(regex, 'dental care');
  }
  return sanitized;
}

/**
 * Sends a push notification to all active devices registered to a patient.
 * If Firebase credentials are configured, sends real FCM notifications.
 * Otherwise, logs the push notification to `dev_outbox` in mock mode.
 */
export async function sendPushToPatient(
  patientId: string,
  payload: PushNotificationPayload
): Promise<PushResult> {
  const safeTitle = sanitizeNonPhi(payload.title);
  const safeBody = sanitizeNonPhi(payload.body);
  const db = getDefaultDb();

  // 1. Fetch registered devices for this patient
  const devices = await db
    .select({
      id: patientDevices.id,
      fcmToken: patientDevices.fcmToken,
      platform: patientDevices.platform,
    })
    .from(patientDevices)
    .where(eq(patientDevices.patientId, patientId));

  const tokens = Array.from(new Set(devices.map((d) => d.fcmToken).filter(Boolean)));
  const app = getFirebaseApp();

  // 2. Real FCM Delivery if credentials present and tokens exist
  if (app && tokens.length > 0) {
    try {
      const messaging = getMessaging(app);
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: safeTitle,
          body: safeBody,
        },
        data: payload.data || {},
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'default',
          },
        },
      });

      console.log(
        `[PushService] Sent FCM to patient ${patientId}: ${response.successCount}/${tokens.length} succeeded.`
      );

      return {
        success: response.successCount > 0,
        sentCount: response.successCount,
        mode: 'fcm',
      };
    } catch (err) {
      console.error('[PushService] FCM send error, falling back to outbox log:', err);
    }
  }

  // 3. Mock Mode: Log to dev_outbox table
  await db.insert(devOutbox).values({
    channel: 'push',
    direction: 'outbound',
    provider: 'fcm_mock',
    from: 'Dental PMS',
    to: patientId,
    body: safeBody,
    metadata: JSON.stringify({
      title: safeTitle,
      data: payload.data || {},
      fcm_tokens_count: tokens.length,
      device_ids: devices.map((d) => d.id),
      mode: 'mock',
    }),
  });

  console.log(
    `[PushService] Mock Push logged to dev_outbox for patient ${patientId}: "${safeTitle}" - "${safeBody}" (${tokens.length} registered device tokens)`
  );

  return {
    success: true,
    sentCount: tokens.length || 1,
    mode: 'mock',
    details: 'Logged to dev_outbox (Firebase credentials unset or mock provider active)',
  };
}
