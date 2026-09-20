import React from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import { LogOut, ShieldCheck, HeartPulse, Building2, User } from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../lib/auth-store';

export default function ProfileScreen() {
  const patient = useAuthStore((s) => s.patient);
  const clinic = useAuthStore((s) => s.clinic);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out from your patient account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await clearAuth();
          router.replace('/clinic-picker');
        },
      },
    ]);
  };

  return (
    <Screen scroll className="p-6">
      <View className="my-4">
        <Text className="text-2xl font-extrabold text-slate-900">
          Patient Profile
        </Text>
        <Text className="text-sm text-slate-500 mt-1">
          Your personal details and medical preferences.
        </Text>
      </View>

      {/* Profile Header Card */}
      <Card className="p-5 mb-5 items-center bg-white">
        <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-3 border-2 border-emerald-200">
          <Text className="text-3xl font-extrabold text-emerald-800">
            {patient?.first_name ? patient.first_name[0] : 'P'}
          </Text>
        </View>
        <Text className="text-xl font-bold text-slate-900">
          {patient ? `${patient.first_name} ${patient.last_name}` : 'Patient Name'}
        </Text>
        <Text className="text-sm text-slate-500 mt-0.5">
          {patient?.phone || '+92 300 0000000'}
        </Text>
        {patient?.email ? (
          <Text className="text-xs text-slate-400 mt-0.5">{patient.email}</Text>
        ) : null}
      </Card>

      {/* Clinical & Health Details */}
      <Card className="p-5 mb-5">
        <View className="flex-row items-center mb-4">
          <HeartPulse color="#059669" size={18} />
          <Text className="text-base font-bold text-slate-900 ml-2">
            Health & Medical Info
          </Text>
        </View>

        <View className="space-y-3">
          <View className="flex-row justify-between border-b border-slate-100 pb-2">
            <Text className="text-xs font-semibold text-slate-500">Blood Group</Text>
            <Text className="text-xs font-bold text-slate-800">
              {patient?.blood_group || 'Not recorded'}
            </Text>
          </View>

          <View className="flex-row justify-between border-b border-slate-100 pb-2">
            <Text className="text-xs font-semibold text-slate-500">Gender</Text>
            <Text className="text-xs font-bold text-slate-800 capitalize">
              {patient?.gender || 'Not specified'}
            </Text>
          </View>

          <View className="flex-row justify-between border-b border-slate-100 pb-2">
            <Text className="text-xs font-semibold text-slate-500">Allergies</Text>
            <Text className="text-xs font-bold text-slate-800">
              {patient?.allergies && patient.allergies.length > 0
                ? patient.allergies.join(', ')
                : 'None known'}
            </Text>
          </View>

          <View className="flex-row justify-between pt-1">
            <Text className="text-xs font-semibold text-slate-500">Medical Alerts</Text>
            <Text className="text-xs font-bold text-slate-800">
              {patient?.medical_alerts && patient.medical_alerts.length > 0
                ? patient.medical_alerts.join(', ')
                : 'None'}
            </Text>
          </View>
        </View>
      </Card>

      {/* Registered Clinic */}
      <Card className="p-5 mb-6 bg-slate-50 border-slate-200">
        <View className="flex-row items-center mb-2">
          <Building2 color="#64748b" size={18} />
          <Text className="text-sm font-bold text-slate-800 ml-2">
            Associated Clinic
          </Text>
        </View>
        <Text className="text-sm font-semibold text-emerald-700">
          {clinic?.name || 'Bright Smile Dental'}
        </Text>
        <Text className="text-xs text-slate-500 mt-1">
          Patient records and treatments are strictly scoped to this dental practice.
        </Text>
      </Card>

      {/* Sign Out Button */}
      <Button
        title="Sign Out"
        variant="danger"
        size="md"
        onPress={handleSignOut}
        className="mb-8"
      />

      <View className="items-center pb-8">
        <View className="flex-row items-center mb-1">
          <ShieldCheck color="#94a3b8" size={14} />
          <Text className="text-xs text-slate-400 ml-1">
            HIPAA & GDPR Compliant Medical Architecture
          </Text>
        </View>
        <Text className="text-xs text-slate-400">
          Dental PMS Mobile • Expo SDK 54
        </Text>
      </View>
    </Screen>
  );
}
