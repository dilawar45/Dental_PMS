import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

export default function PhoneScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: async (fullPhone: string) => {
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || 'b398700a-f746-4a45-afc0-b1020cda02a8';
      return await patientApi.sendOtp(fullPhone, clinicId);
    },
    onSuccess: (data, fullPhone) => {
      setErrorMessage(null);
      if (data.dev_code) {
        Alert.alert(
          'Verification Code',
          `Demo OTP Code: ${data.dev_code}\n(Auto-filled on the next screen)`
        );
      }
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: fullPhone,
          devCode: data.dev_code || '123456',
        },
      });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to send verification code. Please try again.');
      }
    },
  });

  const handleQuickFill = (phone: string) => {
    setPhoneNumber(phone.replace('+92', ''));
    setErrorMessage(null);
  };

  const handleSubmit = () => {
    setErrorMessage(null);
    const cleaned = phoneNumber.replace(/[^0-9]/g, '');

    // Format into +92XXXXXXXXXX
    let formattedPhone = '';
    if (cleaned.startsWith('92') && cleaned.length === 12) {
      formattedPhone = `+${cleaned}`;
    } else if (cleaned.startsWith('0') && cleaned.length === 11) {
      formattedPhone = `+92${cleaned.slice(1)}`;
    } else if (cleaned.length === 10) {
      formattedPhone = `+92${cleaned}`;
    } else {
      setErrorMessage('Please enter a valid 10-digit mobile number (e.g. 300 1234567).');
      return;
    }

    sendOtpMutation.mutate(formattedPhone);
  };

  return (
    <Screen scroll className="p-6">
      <View style={{ padding: 24, paddingTop: 32 }}>
        {/* Brand Logo & Header */}
        <View style={{ alignItems: 'center', marginBottom: 32 }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 28,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 2,
              borderColor: '#a7f3d0',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 40 }}>🦷</Text>
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0f172a',
              textAlign: 'center',
              letterSpacing: -0.5,
            }}
          >
            Welcome to Bright Smile Dental
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: '#64748b',
              textAlign: 'center',
              marginTop: 6,
              lineHeight: 22,
            }}
          >
            Enter your mobile number to continue
          </Text>
        </View>

        {/* Error banner */}
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
            <Text style={{ fontSize: 13, color: '#b91c1c', fontWeight: '500' }}>
              ⚠️ {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* Phone Input */}
        <View style={{ marginBottom: 20 }}>
          <Input
            label="Mobile Number *"
            placeholder="300 1234567"
            value={phoneNumber}
            onChangeText={(text) => {
              setPhoneNumber(text);
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="phone-pad"
            leftAddon="+92"
            helperText="Enter 10-digit mobile number without leading 0"
            maxLength={11}
            autoFocus
          />
        </View>

        {/* Submit CTA */}
        <Button
          title={sendOtpMutation.isPending ? 'Sending Code...' : 'Send Code'}
          onPress={handleSubmit}
          loading={sendOtpMutation.isPending}
          disabled={phoneNumber.trim().length < 9}
          size="lg"
        />

        {/* Quick Demo Test Buttons */}
        <View style={{ marginTop: 28 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: '700',
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
              textAlign: 'center',
            }}
          >
            Quick Demo Accounts
          </Text>

          <TouchableOpacity
            onPress={() => handleQuickFill('3001234501')}
            style={{
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                👤 Muhammad Usman
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                +92 300 1234501 • Seeded Patient
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
              Auto-fill ➔
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickFill('3009998877')}
            style={{
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                👤 New Patient Test
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                +92 300 9998877 • Tests Instant Account Creation
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
              Auto-fill ➔
            </Text>
          </TouchableOpacity>
        </View>

        {/* Patient Terms Note */}
        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 12,
              color: '#94a3b8',
              textAlign: 'center',
              lineHeight: 18,
              paddingHorizontal: 12,
            }}
          >
            By continuing, you agree to our terms. This app is for patients of Bright Smile Dental.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
