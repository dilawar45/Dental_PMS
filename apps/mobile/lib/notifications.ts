import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { patientApi } from './api';

// Configure foreground notification behavior: show alert banner + play sound
if (Platform.OS !== 'web') {
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

/**
 * Requests notification permissions from the user.
 * Returns true if granted, false otherwise.
 */
export async function requestPermissions(): Promise<{ granted: boolean; status: string }> {
  if (Platform.OS === 'web') {
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
  if (Platform.OS === 'web') {
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
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Emulators / Simulators cannot receive push notifications.');
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
      '[Notifications] Native FCM token not available (likely Expo Go). Falling back to Expo push token:',
      nativeErr
    );
  }

  try {
    // 2. Fallback to Expo push token (compatible with Expo Go dev client)
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
  if (Platform.OS === 'web') {
    return () => {};
  }

  // Handle user tapping a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
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
}
