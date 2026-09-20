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
  }>();

  const phone = params.phone || '';
  const devCode = params.devCode || '';
  const isNewPatient = params.isNew === 'true';

  const clinic = useAuthStore((s) => s.clinic);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [otpCode, setOtpCode] = useState(devCode);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
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
        isNewPatient && firstName.trim()
          ? {
              first_name: firstName.trim(),
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
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center my-4"
      >
        <Text className="text-emerald-700 font-medium text-base">
          ← Back to Phone
        </Text>
      </TouchableOpacity>

      <View className="my-6">
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify your number
        </Text>
        <Text className="text-sm text-slate-500 mt-2">
          Enter the 6-digit code sent to{' '}
          <Text className="font-semibold text-slate-800">{phone}</Text>
        </Text>
      </View>

      {devCode ? (
        <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 mb-5">
          <Text className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
            🧪 Dev Mode Mock Code
          </Text>
          <Text className="text-sm font-semibold text-emerald-900 mt-1">
            Verification code is: {devCode}
          </Text>
        </View>
      ) : null}

      {errorMessage ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3.5 mb-5">
          <Text className="text-sm text-red-700 font-medium">{errorMessage}</Text>
        </View>
      ) : null}

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
        autoFocus={!devCode}
      />

      {isNewPatient ? (
        <View className="bg-slate-100/70 rounded-2xl p-4 my-2 border border-slate-200">
          <Text className="text-sm font-bold text-slate-800 mb-3">
            👋 Welcome! Tell us your name
          </Text>
          <Input
            label="First Name"
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
        </View>
      ) : null}

      <Button
        title="Verify & Continue"
        onPress={handleVerify}
        loading={verifyOtpMutation.isPending}
        size="lg"
        className="mt-4"
      />

      <View className="flex-row items-center justify-center mt-6">
        <Text className="text-sm text-slate-500">Didn't get the code? </Text>
        {countdown > 0 ? (
          <Text className="text-sm font-semibold text-slate-400">
            Resend in {countdown}s
          </Text>
        ) : (
          <TouchableOpacity
            onPress={() => resendOtpMutation.mutate()}
            disabled={resendOtpMutation.isPending}
          >
            <Text className="text-sm font-bold text-emerald-600">
              Resend Code
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Screen>
  );
}
