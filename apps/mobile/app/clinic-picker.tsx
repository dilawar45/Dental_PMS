import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/ui/screen';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuthStore } from '../lib/auth-store';

const DEFAULT_CLINIC_ID =
  process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
  'b398700a-f746-4a45-afc0-b1020cda02a8';

interface ClinicOption {
  id: string;
  name: string;
  address: string;
  phone: string;
  timings: string;
}

const AVAILABLE_CLINICS: ClinicOption[] = [
  {
    id: DEFAULT_CLINIC_ID,
    name: 'Bright Smile Dental',
    address: '123 Medical Center Blvd, Suite 400',
    phone: '+92 300 1234567',
    timings: 'Mon – Sat: 9:00 AM – 7:00 PM',
  },
];

export default function ClinicPickerScreen() {
  const [selectedClinicId, setSelectedClinicId] = useState<string>(DEFAULT_CLINIC_ID);
  const setClinic = useAuthStore((s) => s.setClinic);

  const handleContinue = async () => {
    const chosen = AVAILABLE_CLINICS.find((c) => c.id === selectedClinicId);
    if (!chosen) return;

    await setClinic({
      id: chosen.id,
      name: chosen.name,
    });

    router.push('/(auth)/phone');
  };

  return (
    <Screen scroll className="p-6">
      <View className="items-center my-6">
        <View className="w-16 h-16 bg-emerald-100 rounded-2xl items-center justify-center mb-4">
          <Text className="text-3xl">🏥</Text>
        </View>
        <Text className="text-2xl font-bold text-slate-900 text-center">
          Choose Your Dental Clinic
        </Text>
        <Text className="text-sm text-slate-500 text-center mt-1.5 px-4">
          Select the dental practice where you receive treatment or want to book an appointment.
        </Text>
      </View>

      <View className="space-y-3 mb-8">
        {AVAILABLE_CLINICS.map((clinic) => {
          const isSelected = clinic.id === selectedClinicId;
          return (
            <TouchableOpacity
              key={clinic.id}
              onPress={() => setSelectedClinicId(clinic.id)}
              activeOpacity={0.85}
            >
              <Card
                className={`border-2 transition-colors ${
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/40'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-row items-center space-x-2">
                    <Text className="text-lg font-bold text-slate-900">
                      {clinic.name}
                    </Text>
                  </View>
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected ? (
                      <View className="w-2.5 h-2.5 rounded-full bg-white" />
                    ) : null}
                  </View>
                </View>

                <Text className="text-sm text-slate-600 mb-1">
                  📍 {clinic.address}
                </Text>
                <Text className="text-sm text-slate-600 mb-1">
                  📞 {clinic.phone}
                </Text>
                <Text className="text-xs font-medium text-emerald-700 mt-1">
                  ⏰ {clinic.timings}
                </Text>
              </Card>
            </TouchableOpacity>
          );
        })}
      </View>

      <Button
        title="Continue to Login"
        onPress={handleContinue}
        size="lg"
        disabled={!selectedClinicId}
      />

      <Text className="text-xs text-center text-slate-400 mt-6">
        Multi-tenant secure patient access • Dental PMS
      </Text>
    </Screen>
  );
}
