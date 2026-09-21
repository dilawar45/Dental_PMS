import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

export default function PhoneScreen() {
  const clinic = useAuthStore((s) => s.clinic);
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sendOtpMutation = useMutation({
    mutationFn: async (fullPhone: string) => {
      const clinicId = clinic?.id || process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID || '';
      return await patientApi.sendOtp(fullPhone, clinicId);
    },
    onSuccess: (data, fullPhone) => {
      setErrorMessage(null);
      if (data.dev_code) {
        Alert.alert(
          'Verification Code',
          `Dev Mode OTP Code: ${data.dev_code}\n(Auto-filled on the next screen)`
        );
      }
      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: fullPhone,
          devCode: data.dev_code || '',
          isNew: authMode === 'register' || data.is_new_patient ? 'true' : 'false',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
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

  const handleQuickFill = (phone: string, first: string, last: string) => {
    setPhoneNumber(phone.replace('+92', ''));
    setFirstName(first);
    setLastName(last);
    setErrorMessage(null);
  };

  const handleSubmit = () => {
    setErrorMessage(null);

    if (authMode === 'register' && !firstName.trim()) {
      setErrorMessage('Please enter your first name.');
      return;
    }

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
      <View style={{ padding: 24 }}>
        {/* Top Back Nav */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
          activeOpacity={0.7}
        >
          <Text style={{ color: '#059669', fontWeight: '600', fontSize: 15 }}>
            ← Change Clinic
          </Text>
        </TouchableOpacity>

        {/* Clinic Pill */}
        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#d1fae5',
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#065f46',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            🏥 {clinic?.name || 'Bright Smile Dental'}
          </Text>
        </View>

        {/* Auth Mode Toggle: Sign In vs Register */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 14,
            padding: 4,
            marginBottom: 24,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              setAuthMode('signin');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: authMode === 'signin' ? '#ffffff' : 'transparent',
              alignItems: 'center',
              shadowColor: authMode === 'signin' ? '#000000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: authMode === 'signin' ? 0.08 : 0,
              shadowRadius: 2,
              elevation: authMode === 'signin' ? 2 : 0,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: authMode === 'signin' ? '700' : '500',
                color: authMode === 'signin' ? '#0f172a' : '#64748b',
              }}
            >
              Sign In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: authMode === 'register' ? '#ffffff' : 'transparent',
              alignItems: 'center',
              shadowColor: authMode === 'register' ? '#000000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: authMode === 'register' ? 0.08 : 0,
              shadowRadius: 2,
              elevation: authMode === 'register' ? 2 : 0,
            }}
            activeOpacity={0.8}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: authMode === 'register' ? '700' : '500',
                color: authMode === 'register' ? '#059669' : '#64748b',
              }}
            >
              Register (New)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Screen Heading */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 26,
              fontWeight: '800',
              color: '#0f172a',
              letterSpacing: -0.5,
            }}
          >
            {authMode === 'signin' ? 'Welcome back' : 'Create patient account'}
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', marginTop: 6, lineHeight: 20 }}>
            {authMode === 'signin'
              ? 'Enter your mobile number to receive a one-time login code.'
              : 'Register your details to book appointments and track treatments.'}
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

        {/* Registration Fields */}
        {authMode === 'register' ? (
          <View style={{ gap: 4, marginBottom: 4 }}>
            <Input
              label="First Name *"
              placeholder="e.g. Ayesha"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="words"
            />
            <Input
              label="Last Name"
              placeholder="e.g. Khan"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
            />
          </View>
        ) : null}

        {/* Phone Input */}
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
          autoFocus={authMode === 'signin'}
        />

        {/* Submit CTA */}
        <Button
          title={
            authMode === 'signin'
              ? 'Send Verification Code'
              : 'Register & Send Code'
          }
          onPress={handleSubmit}
          loading={sendOtpMutation.isPending}
          disabled={phoneNumber.trim().length < 9}
          size="lg"
        />

        {/* Quick Demo Test Buttons */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 10,
            }}
          >
            🧪 Quick Test Patient Accounts
          </Text>

          <TouchableOpacity
            onPress={() => handleQuickFill('3001234501', 'Muhammad', 'Usman')}
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
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                +92 300 1234501 • Has treatment & invoice history
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
              Fill ➔
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickFill('3001234502', 'Fatima', 'Zahra')}
            style={{
              backgroundColor: '#f8fafc',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 12,
              padding: 12,
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            activeOpacity={0.7}
          >
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e293b' }}>
                👤 Fatima Zahra
              </Text>
              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                +92 300 1234502 • Seeded patient
              </Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#059669' }}>
              Fill ➔
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Info Card */}
        <Card
          style={{
            backgroundColor: '#f8fafc',
            borderColor: '#e2e8f0',
            borderRadius: 14,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 2 }}>
            🔒 Passwordless Security
          </Text>
          <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
            Patients authenticate securely via one-time SMS verification code. No password creation or recovery headaches required.
          </Text>
        </Card>
      </View>
    </Screen>
  );
}
