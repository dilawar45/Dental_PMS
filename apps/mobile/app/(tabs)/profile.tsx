import React from 'react';
import { View, Text, Alert, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import {
  LogOut,
  ShieldCheck,
  HeartPulse,
  Building2,
  User,
  Stethoscope,
  Grid3X3,
  Receipt,
  ChevronRight,
  FolderOpen,
} from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../lib/auth-store';

export default function ProfileScreen() {
  const patient = useAuthStore((s) => s.patient);
  const clinic = useAuthStore((s) => s.clinic);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const handleSignOut = async () => {
    const doLogout = async () => {
      await clearAuth();
      router.replace('/(auth)/login');
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm('Are you sure you want to sign out from your patient account?')) {
          await doLogout();
        }
      } else {
        await doLogout();
      }
      return;
    }

    Alert.alert('Sign Out', 'Are you sure you want to sign out from your patient account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: doLogout,
      },
    ]);
  };

  return (
    <Screen scroll contentContainerStyle={{ padding: 18, paddingTop: 14 }}>
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

      {/* My Records Quick Links */}
      <Card className="p-5 mb-5">
        <View className="flex-row items-center mb-3">
          <FolderOpen color="#059669" size={18} />
          <Text className="text-base font-bold text-slate-900 ml-2">
            My Records
          </Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3">
          Quickly access your treatment records, odontogram, and billing statements.
        </Text>

        <View className="divide-y divide-slate-100">
          {/* Link 1: Treatments */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/records?tab=treatments')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-emerald-50 items-center justify-center mr-3 border border-emerald-100">
                <Stethoscope size={18} color="#059669" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  Treatments
                </Text>
                <Text className="text-xs text-slate-500">
                  Procedures and restorative dental history
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          {/* Link 2: Dental Chart */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/records?tab=chart')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                <Grid3X3 size={18} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  Dental Chart
                </Text>
                <Text className="text-xs text-slate-500">
                  Interactive odontogram and surface conditions
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>

          {/* Link 3: Invoices */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/records?tab=invoices')}
            activeOpacity={0.7}
            className="flex-row items-center justify-between py-3"
          >
            <View className="flex-row items-center flex-1 mr-3">
              <View className="w-9 h-9 rounded-xl bg-amber-50 items-center justify-center mr-3 border border-amber-100">
                <Receipt size={18} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-slate-900">
                  Invoices & Receipts
                </Text>
                <Text className="text-xs text-slate-500">
                  Billing history, balances, and payment receipts
                </Text>
              </View>
            </View>
            <ChevronRight size={16} color="#94a3b8" />
          </TouchableOpacity>
        </View>
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
          <ShieldCheck color="#059669" size={14} />
          <Text className="text-xs font-semibold text-slate-500 ml-1">
            Bright Smile Dental Clinic
          </Text>
        </View>
        <Text className="text-xs text-slate-400">
          Your trusted dental care partner
        </Text>
      </View>
    </Screen>
  );
}
