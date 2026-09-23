import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../lib/auth-store';

export default function SplashScreen() {
  const { isHydrated, token, patient, clinic, setClinic } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    const defaultClinicId =
      process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
      'b398700a-f746-4a45-afc0-b1020cda02a8';

    if (!clinic) {
      setClinic({
        id: defaultClinicId,
        name: 'Bright Smile Dental',
      });
    }

    if (token && patient) {
      router.replace('/(tabs)');
    } else {
      router.replace('/(auth)/phone');
    }
  }, [isHydrated, token, patient, clinic]);

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <View className="w-20 h-20 bg-emerald-100 rounded-3xl items-center justify-center mb-6 shadow-sm">
        <Text className="text-4xl">🦷</Text>
      </View>
      <Text className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        Bright Smile Dental
      </Text>
      <Text className="text-sm font-medium text-slate-500 mb-8">
        Your trusted dental care partner
      </Text>
      <ActivityIndicator size="small" color="#059669" />
    </View>
  );
}
