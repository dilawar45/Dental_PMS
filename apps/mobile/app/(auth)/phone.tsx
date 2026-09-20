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
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || '';
      return await patientApi.sendOtp(fullPhone, clinicId);
    },
    onSuccess: (data, fullPhone) => {
      setErrorMessage(null);
      // If server returned a dev_code in mock mode, alert for convenience
      if (data.dev_code) {
        Alert.alert(
          'Verification Code',
          `Dev Mode OTP Code: ${data.dev_code}\n(Also auto-filled on the next screen)`
        );
      }
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: fullPhone,
          devCode: data.dev_code || '',
          isNew: data.is_new_patient ? 'true' : 'false',
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
      <TouchableOpacity
        onPress={() => router.back()}
        className="flex-row items-center my-4"
      >
        <Text className="text-emerald-700 font-medium text-base">
          ← Change Clinic
        </Text>
      </TouchableOpacity>

      <View className="my-6">
        <View className="bg-emerald-100 self-start px-3 py-1 rounded-full mb-3">
          <Text className="text-xs font-bold text-emerald-800 tracking-wide uppercase">
            {clinic?.name || 'Bright Smile Dental'}
          </Text>
        </View>
        <Text className="text-3xl font-extrabold text-slate-900 tracking-tight">
          What's your phone number?
        </Text>
        <Text className="text-sm text-slate-500 mt-2">
          We will send you a 6-digit verification code to sign in or register your patient account.
        </Text>
      </View>

      {errorMessage ? (
        <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          <Text className="text-sm text-red-700 font-medium">{errorMessage}</Text>
        </View>
      ) : null}

      <Input
        label="Mobile Number"
        placeholder="300 1234567"
        value={phoneNumber}
        onChangeText={(text) => {
          setPhoneNumber(text);
          if (errorMessage) setErrorMessage(null);
        }}
        keyboardType="phone-pad"
        leftAddon="+92"
        helperText="Enter 10-digit phone number without leading 0"
        maxLength={11}
        autoFocus
      />

      <Button
        title="Send Verification Code"
        onPress={handleSubmit}
        loading={sendOtpMutation.isPending}
        disabled={phoneNumber.trim().length < 9}
        size="lg"
        className="mt-2"
      />

      <View className="mt-8 bg-slate-100/80 rounded-xl p-4">
        <Text className="text-xs font-semibold text-slate-700 mb-1">
          🔒 Secure Patient Access
        </Text>
        <Text className="text-xs text-slate-500">
          No password needed. You authenticate via one-time SMS verification. Your records are protected under medical privacy standards.
        </Text>
      </View>
    </Screen>
  );
}
