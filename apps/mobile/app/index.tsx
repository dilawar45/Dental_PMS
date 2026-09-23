import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../lib/auth-store';
import { Button } from '../components/ui/button';

export default function WelcomeScreen() {
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

    // Auto-redirect if already authenticated
    if (token && patient) {
      router.replace('/(tabs)');
    }
  }, [isHydrated, token, patient, clinic]);

  const handleSignIn = () => {
    if (token && patient) {
      router.replace('/(tabs)');
    } else {
      router.push('/(auth)/login');
    }
  };

  const handleRegister = () => {
    router.push('/(auth)/register');
  };

  return (
    <View
      className="flex-1 bg-white justify-between px-6 py-12"
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 64,
        paddingBottom: 40,
      }}
    >
      {/* Top Header / Branding */}
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <View
          className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-3xl items-center justify-center mb-8 shadow-sm"
          style={{
            width: 96,
            height: 96,
            backgroundColor: '#ecfdf5',
            borderWidth: 1.5,
            borderColor: '#a7f3d0',
            borderRadius: 28,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 28,
          }}
        >
          <Text style={{ fontSize: 44 }}>🦷</Text>
        </View>

        <View
          style={{
            backgroundColor: '#f0fdf4',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: '#bbf7d0',
          }}
        >
          <Text style={{ color: '#059669', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
            BRIGHT SMILE DENTAL
          </Text>
        </View>

        <Text
          className="text-4xl font-extrabold text-slate-900 text-center tracking-tight mb-4"
          style={{
            fontSize: 34,
            fontWeight: '800',
            color: '#0f172a',
            textAlign: 'center',
            lineHeight: 42,
            marginBottom: 14,
          }}
        >
          Smile Brightly{'\n'}With Confidence
        </Text>

        <Text
          className="text-base text-slate-500 text-center max-w-xs"
          style={{
            fontSize: 15,
            color: '#64748b',
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 300,
          }}
        >
          Your trusted dental care partner. Manage your appointments, treatments, and dental records with ease.
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={{ width: '100%', gap: 14 }}>
        <Button
          title="Sign In"
          size="lg"
          variant="primary"
          onPress={handleSignIn}
          style={{
            backgroundColor: '#059669',
            borderRadius: 16,
            paddingVertical: 16,
          }}
        />

        <TouchableOpacity
          onPress={handleRegister}
          activeOpacity={0.7}
          style={{
            alignItems: 'center',
            paddingVertical: 12,
          }}
        >
          <Text style={{ fontSize: 14, color: '#64748b', fontWeight: '500' }}>
            New patient?{' '}
            <Text style={{ color: '#059669', fontWeight: '700' }}>
              Create an account
            </Text>
          </Text>
        </TouchableOpacity>

        {/* Footer Note */}
        <View style={{ alignItems: 'center', marginTop: 12 }}>
          <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
            Bright Smile Dental Clinic • Lahore, Pakistan
          </Text>
        </View>
      </View>
    </View>
  );
}
