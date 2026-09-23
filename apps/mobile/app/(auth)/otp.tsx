import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

export default function OtpScreen() {
  const params = useLocalSearchParams<{
    phone?: string;
    devCode?: string;
    isNew?: string;
    firstName?: string;
    lastName?: string;
  }>();

  const phone = params.phone || '';
  const devCode = params.devCode || '123456';

  const clinic = useAuthStore((s) => s.clinic);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [otpCode, setOtpCode] = useState(devCode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || 'b398700a-f746-4a45-afc0-b1020cda02a8';
      const profile = {
        first_name: params.firstName?.trim() || 'Demo',
        last_name: params.lastName?.trim() || 'Patient',
      };

      return await patientApi.verifyOtp(phone, otpCode.trim(), clinicId, profile);
    },
    onSuccess: async (data) => {
      setErrorMessage(null);
      await setAuth({
        token: data.token,
        patient: data.patient,
        clinic: clinic ?? undefined,
      });
      router.replace('/(tabs)');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Invalid verification code. Please check and try again.');
      }
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: async () => {
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || 'b398700a-f746-4a45-afc0-b1020cda02a8';
      return await patientApi.sendOtp(phone, clinicId);
    },
    onSuccess: (data) => {
      setErrorMessage(null);
      setCountdown(30);
      if (data.dev_code) {
        setOtpCode(data.dev_code);
      }
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to resend code.');
      }
    },
  });

  const handleVerify = () => {
    setErrorMessage(null);
    if (otpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    verifyOtpMutation.mutate();
  };

  return (
    <Screen scroll className="p-6">
      <View style={{ padding: 24, paddingTop: 32 }}>
        {/* Back Link */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#059669', fontWeight: '600', fontSize: 15 }}>
            ← Back to Phone
          </Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={{ marginBottom: 24 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 20,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: '#a7f3d0',
            }}
          >
            <Text style={{ fontSize: 26 }}>🔑</Text>
          </View>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: -0.5,
            }}
          >
            Verify your phone
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 20 }}>
            Enter the 6-digit verification code for{' '}
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>{phone}</Text>
          </Text>
        </View>

        {/* Demo Mode Code Quick Tap Banner */}
        <TouchableOpacity
          onPress={() => setOtpCode(devCode || '123456')}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#ecfdf5',
            borderWidth: 1.5,
            borderColor: '#6ee7b7',
            borderRadius: 16,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#065f46',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Demo Verification Code
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#047857',
                letterSpacing: 4,
                marginTop: 2,
              }}
            >
              {devCode || '123456'}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: '#059669',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
              Auto-Filled ✓
            </Text>
          </View>
        </TouchableOpacity>

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
            <Text style={{ fontSize: 13, color: '#b91c1c', fontWeight: '500' }}>
              ⚠️ {errorMessage}
            </Text>
          </View>
        ) : null}

        {/* 6-Digit Code Input */}
        <View style={{ marginBottom: 20 }}>
          <Input
            label="6-Digit Verification Code"
            placeholder="123456"
            value={otpCode}
            onChangeText={(text) => {
              setOtpCode(text.replace(/[^0-9]/g, ''));
              if (errorMessage) setErrorMessage(null);
            }}
            keyboardType="number-pad"
            maxLength={6}
            helperText="Demo mode: use 123456"
          />
        </View>

        {/* Verify Button */}
        <Button
          title={verifyOtpMutation.isPending ? 'Verifying...' : 'Verify & Continue'}
          onPress={handleVerify}
          loading={verifyOtpMutation.isPending}
          disabled={otpCode.trim().length !== 6}
          size="lg"
        />

        {/* Resend Link */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 24,
          }}
        >
          <Text style={{ fontSize: 14, color: '#64748b' }}>Didn't receive code? </Text>
          {countdown > 0 ? (
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#94a3b8' }}>
              Resend in {countdown}s
            </Text>
          ) : (
            <TouchableOpacity
              onPress={() => resendOtpMutation.mutate()}
              disabled={resendOtpMutation.isPending}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#059669' }}>
                Resend Code
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer Branding */}
        <View style={{ marginTop: 32, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#64748b' }}>
            Bright Smile Dental Clinic
          </Text>
          <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            Your trusted dental care partner
          </Text>
        </View>
      </View>
    </Screen>
  );
}
