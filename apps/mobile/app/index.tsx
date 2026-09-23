import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
      }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          paddingHorizontal: 24,
          paddingVertical: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header / Branding */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <View
            style={{
              width: 88,
              height: 88,
              backgroundColor: '#ecfdf5',
              borderWidth: 1.5,
              borderColor: '#a7f3d0',
              borderRadius: 24,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 40 }}>🦷</Text>
          </View>

          <View
            style={{
              backgroundColor: '#f0fdf4',
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 20,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#bbf7d0',
            }}
          >
            <Text style={{ color: '#059669', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>
              BRIGHT SMILE DENTAL
            </Text>
          </View>

          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: '#0f172a',
              textAlign: 'center',
              lineHeight: 38,
              marginBottom: 12,
              letterSpacing: -0.5,
            }}
          >
            Smile Brightly{'\n'}With Confidence
          </Text>

          <Text
            style={{
              fontSize: 14,
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
        <View style={{ width: '100%', gap: 12, marginTop: 32 }}>
          <Button
            title="Sign In"
            size="lg"
            variant="primary"
            onPress={handleSignIn}
            style={{
              backgroundColor: '#059669',
              borderRadius: 16,
              paddingVertical: 15,
            }}
          />

          <TouchableOpacity
            onPress={handleRegister}
            activeOpacity={0.7}
            style={{
              alignItems: 'center',
              paddingVertical: 10,
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
          <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
              Bright Smile Dental Clinic • Lahore, Pakistan
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
