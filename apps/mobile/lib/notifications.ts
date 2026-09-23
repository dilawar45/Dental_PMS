import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { patientApi } from './api';

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Dynamic require prevents expo-notifications from executing and throwing
// the SDK 53/54 fatal error during module evaluation inside Expo Go on Android
function getNotificationsModule() {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch (err) {
    console.warn('[Notifications] Could not load expo-notifications:', err);
    return null;
  }
}

// Configure foreground notification behavior: show alert banner + play sound
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    const Notifications = getNotificationsModule();
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  } catch (err) {
    console.warn('[Notifications] setNotificationHandler skipped:', err);
  }
}

/**
 * Requests notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestPermissions(): Promise<{ granted: boolean; status: string }> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { granted: false, status: 'unsupported' };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    return {
      granted: finalStatus === 'granted',
      status: finalStatus,
    };
  } catch (err) {
    console.warn('[Notifications] Error requesting permissions:', err);
    return { granted: false, status: 'error' };
  }
}

/**
 * Checks current notification permission without prompting.
 */
export async function checkPermissions(): Promise<{ granted: boolean; status: string }> {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return { granted: false, status: 'unsupported' };
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      status,
    };
  } catch {
    return { granted: false, status: 'unknown' };
  }
}

/**
 * Retrieves the device push token (FCM token for standalone APK, or Expo Push Token for Expo Go).
 */
export async function getDevicePushToken(): Promise<string | null> {
  const Notifications = getNotificationsModule();
  if (!Notifications || !Device.isDevice) {
    return null;
  }

  try {
    // 1. Try native FCM token (primary for standalone Android APK build)
    const nativeToken = await Notifications.getDevicePushTokenAsync();
    if (nativeToken && nativeToken.data) {
      return nativeToken.data;
    }
  } catch (nativeErr) {
    console.log(
      '[Notifications] Native FCM token not available. Falling back to Expo push token:',
      nativeErr
    );
  }

  try {
    // 2. Fallback to Expo push token
    const expoToken = await Notifications.getExpoPushTokenAsync();
    return expoToken.data;
  } catch (expoErr) {
    console.warn('[Notifications] Failed to obtain push token:', expoErr);
    return null;
  }
}

/**
 * Registers the device push token with the backend patient device registry.
 */
export async function registerDeviceWithBackend(token: string): Promise<string | null> {
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  try {
    const res = await patientApi.registerDevice(token, platform);
    return res.device?.id || null;
  } catch (err) {
    console.error('[Notifications] Failed to register device with backend:', err);
    return null;
  }
}

/**
 * Unregisters the device from the backend on logout.
 */
export async function unregisterDeviceFromBackend(deviceId: string): Promise<void> {
  try {
    await patientApi.unregisterDevice(deviceId);
  } catch (err) {
    console.warn('[Notifications] Failed to unregister device from backend:', err);
  }
}

/**
 * Sets up foreground and background notification response listeners.
 * Tapping a notification navigates to the relevant screen (e.g. appointments).
 */
export function setupNotificationListeners(): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) {
    return () => {};
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
      try {
        const data = response.notification.request.content.data;
        console.log('[Notifications] User tapped notification with data:', data);

        if (data && (data['appointment_id'] || data['type'] === 'booking_approved')) {
          router.push('/(tabs)/appointments');
        } else if (data && data['booking_request_id']) {
          router.push('/book-appointment');
        }
      } catch (err) {
        console.error('[Notifications] Error navigating from notification tap:', err);
      }
    });

    return () => {
      responseSubscription.remove();
    };
  } catch {
    return () => {};
  }
}
