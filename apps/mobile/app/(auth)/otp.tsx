import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
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
  const devCode = params.devCode || '';
  const isNewPatient = params.isNew === 'true';

  const clinic = useAuthStore((s) => s.clinic);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [otpCode, setOtpCode] = useState(devCode || '');
  const [firstName, setFirstName] = useState(params.firstName || '');
  const [lastName, setLastName] = useState(params.lastName || '');
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
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || '';
      const profile =
        isNewPatient || firstName.trim()
          ? {
              first_name: firstName.trim() || 'New',
              last_name: lastName.trim() || 'Patient',
            }
          : undefined;

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
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || '';
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
    if (isNewPatient && !firstName.trim()) {
      setErrorMessage('Please enter your first name.');
      return;
    }

    verifyOtpMutation.mutate();
  };

  return (
    <Screen scroll className="p-6">
      <View style={{ padding: 24 }}>
        {/* Back Link */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
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
              width: 52,
              height: 52,
              borderRadius: 16,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#a7f3d0',
            }}
          >
            <Text style={{ fontSize: 24 }}>🔑</Text>
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
            Enter the 6-digit verification code sent to{' '}
            <Text style={{ fontWeight: '700', color: '#0f172a' }}>{phone}</Text>
          </Text>
        </View>

        {/* Mock Dev Code Quick Tap Banner */}
        {devCode ? (
          <TouchableOpacity
            onPress={() => setOtpCode(devCode)}
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
                🧪 Dev Mode Mock Code
              </Text>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '800',
                  color: '#047857',
                  letterSpacing: 4,
                  marginTop: 2,
                }}
              >
                {devCode}
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
        ) : null}

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
        <Input
          label="6-Digit Verification Code"
          placeholder="000000"
          value={otpCode}
          onChangeText={(text) => {
            setOtpCode(text.replace(/[^0-9]/g, ''));
            if (errorMessage) setErrorMessage(null);
          }}
          keyboardType="number-pad"
          maxLength={6}
          helperText="Enter 6-digit one-time passcode"
        />

        {/* New Patient Registration Details (if not provided on previous screen) */}
        {isNewPatient && (!params.firstName || !firstName) ? (
          <Card
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 12 }}>
              👋 Welcome! Tell us your name
            </Text>
            <Input
              label="First Name *"
              placeholder="e.g. Ayesha"
              value={firstName}
              onChangeText={setFirstName}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Khan"
              value={lastName}
              onChangeText={setLastName}
            />
          </Card>
        ) : null}

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
      </View>
    </Screen>
  );
}
