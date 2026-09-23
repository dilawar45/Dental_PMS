import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

function formatCnicInput(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) {
    return digits;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

export default function ForgotPasswordScreen() {
  const { clinic } = useAuthStore();
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clinicId =
    clinic?.id ||
    process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
    'b398700a-f746-4a45-afc0-b1020cda02a8';

  const handleCnicChange = (text: string) => {
    setCnic(formatCnicInput(text));
    if (errorMessage) setErrorMessage(null);
  };

  const handleVerify = async () => {
    setErrorMessage(null);

    if (!/^\d{5}-\d{7}-\d$/.test(cnic)) {
      setErrorMessage('Please enter a valid 13-digit CNIC (#####-#######-#)');
      return;
    }

    const cleanPhoneDigits = phone.replace(/\D/g, '');
    let normalizedPhone = '';
    if (cleanPhoneDigits.startsWith('92') && cleanPhoneDigits.length === 12) {
      normalizedPhone = `+${cleanPhoneDigits}`;
    } else if (cleanPhoneDigits.startsWith('03') && cleanPhoneDigits.length === 11) {
      normalizedPhone = `+92${cleanPhoneDigits.slice(1)}`;
    } else if (cleanPhoneDigits.length === 10 && cleanPhoneDigits.startsWith('3')) {
      normalizedPhone = `+92${cleanPhoneDigits}`;
    } else {
      setErrorMessage('Please enter a valid Pakistani mobile number (e.g. 03001234567)');
      return;
    }

    setLoading(true);
    try {
      await patientApi.forgotPassword({
        cnic: cnic.trim(),
        phone: normalizedPhone,
        clinic_id: clinicId,
      });

      // Navigate to reset-password passing cnic and phone as route params
      router.push({
        pathname: '/(auth)/reset-password',
        params: {
          cnic: cnic.trim(),
          phone: normalizedPhone,
        },
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to verify identity. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
          {/* Header Branding */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 68,
                height: 68,
                backgroundColor: '#ecfdf5',
                borderWidth: 1.5,
                borderColor: '#a7f3d0',
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 32 }}>🔐</Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: -0.5,
                marginBottom: 6,
              }}
            >
              Reset Password
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: '#64748b',
                textAlign: 'center',
                lineHeight: 20,
                maxWidth: 280,
              }}
            >
              Verify your patient identity using your registered CNIC and mobile number.
            </Text>
          </View>

          {/* Form Card */}
          <Card
            className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm"
            style={{
              padding: 24,
              backgroundColor: '#ffffff',
              borderRadius: 24,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              marginBottom: 20,
            }}
          >
            {/* Error Banner */}
            {errorMessage ? (
              <View
                style={{
                  backgroundColor: '#fef2f2',
                  borderWidth: 1,
                  borderColor: '#fecaca',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '500' }}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* CNIC */}
            <Input
              label="CNIC (National ID)"
              placeholder="35201-1234567-1"
              value={cnic}
              onChangeText={handleCnicChange}
              keyboardType="number-pad"
              maxLength={15}
            />

            {/* Phone */}
            <Input
              label="Registered Mobile Number"
              placeholder="0300 1234567"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="phone-pad"
              leftAddon="+92"
            />

            {/* Verify Button */}
            <Button
              title="Verify Identity"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              onPress={handleVerify}
              style={{
                backgroundColor: '#059669',
                borderRadius: 14,
                marginTop: 8,
              }}
            />
          </Card>

          {/* Back to Sign In Link */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 14, color: '#64748b' }}>
                Remember your password?{' '}
                <Text style={{ color: '#059669', fontWeight: '700' }}>
                  Sign In
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </SafeAreaView>
  );
}
