import '../global.css';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { queryClient } from '../lib/query-client';
import { useAuthStore } from '../lib/auth-store';
import { ErrorBoundary } from '../components/error-boundary';
import {
  requestPermissions,
  getDevicePushToken,
  registerDeviceWithBackend,
  setupNotificationListeners,
} from '../lib/notifications';

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const token = useAuthStore((s) => s.token);
  const patient = useAuthStore((s) => s.patient);
  const registeredDeviceId = useAuthStore((s) => s.registeredDeviceId);
  const setRegisteredDeviceId = useAuthStore((s) => s.setRegisteredDeviceId);

  // 1. Hydrate authentication state on boot
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 2. Setup notification listeners & register device when authenticated
  useEffect(() => {
    if (!isHydrated || Platform.OS === 'web') return;

    // Listen for notification taps
    const cleanupListeners = setupNotificationListeners();

    // If authenticated, request permissions and register device push token
    if (token && patient?.id) {
      (async () => {
        try {
          const { granted } = await requestPermissions();
          if (granted) {
            const pushToken = await getDevicePushToken();
            if (pushToken && !registeredDeviceId) {
              const deviceId = await registerDeviceWithBackend(pushToken);
              if (deviceId) {
                await setRegisteredDeviceId(deviceId);
                console.log('[Layout] Successfully registered patient device:', deviceId);
              }
            }
          }
        } catch (err) {
          console.warn('[Layout] Device registration flow error:', err);
        }
      })();
    }

    return () => {
      cleanupListeners();
    };
  }, [isHydrated, token, patient?.id, registeredDeviceId, setRegisteredDeviceId]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" />
        <ErrorBoundary fallbackTitle="Application Error">
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="book-appointment"
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="invoice/[id]"
              options={{ animation: 'slide_from_right' }}
            />
          </Stack>
        </ErrorBoundary>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
