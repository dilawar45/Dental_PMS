import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../lib/auth-store';

export default function SplashScreen() {
  const { isHydrated, token, patient } = useAuthStore();

  useEffect(() => {
    if (!isHydrated) return;

    if (token && patient) {
      router.replace('/(tabs)');
    } else {
      router.replace('/clinic-picker');
    }
  }, [isHydrated, token, patient]);

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <View className="w-20 h-20 bg-emerald-100 rounded-3xl items-center justify-center mb-6 shadow-sm">
        <Text className="text-4xl">🦷</Text>
      </View>
      <Text className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
        Dental PMS
      </Text>
      <Text className="text-sm font-medium text-slate-500 mb-8">
        Patient Portal & Care Companion
      </Text>
      <ActivityIndicator size="small" color="#059669" />
    </View>
  );
}
