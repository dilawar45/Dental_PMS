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
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

export default function LoginScreen() {
  const { setAuth, clinic } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clinicId =
    clinic?.id ||
    process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
    'b398700a-f746-4a45-afc0-b1020cda02a8';

  const handleLogin = async () => {
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      const response = await patientApi.login({
        email: trimmedEmail,
        password,
        clinic_id: clinicId,
      });

      const { token, patient } = response;
      const nameParts = (patient.full_name || 'Patient').split(' ');
      const firstName = nameParts[0] || 'Patient';
      const lastName = nameParts.slice(1).join(' ') || '';

      await setAuth({
        token,
        patient: {
          id: patient.id,
          first_name: firstName,
          last_name: lastName,
          phone: patient.phone,
          email: patient.email,
          clinic_id: clinicId,
        },
      });

      router.replace('/(tabs)');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Invalid email or password');
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Unable to connect. Please check your internet connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('muhammad@brightsmile.com');
    setPassword('DevPassword123!');
    setErrorMessage(null);
  };

  return (
    <Screen className="bg-slate-50" style={{ backgroundColor: '#f8fafc' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
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
              <Text style={{ fontSize: 32 }}>🦷</Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              Bright Smile Dental
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b' }}>
              Sign in to manage your appointments & records
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

            {/* Email Input */}
            <Input
              label="Email Address"
              placeholder="e.g. name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />

            {/* Password Input with show/hide toggle */}
            <View style={{ position: 'relative', marginBottom: 6 }}>
              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 36,
                  padding: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Forgot Password Link */}
            <View style={{ alignItems: 'flex-end', marginBottom: 20 }}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <Button
              title="Sign In"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              onPress={handleLogin}
              style={{
                backgroundColor: '#059669',
                borderRadius: 14,
              }}
            />

            {/* Demo Quick Fill Chip */}
            <TouchableOpacity
              onPress={handleQuickDemo}
              activeOpacity={0.7}
              style={{
                marginTop: 18,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 12, color: '#475569', fontWeight: '500' }}>
                ⚡ Fill Demo: <Text style={{ color: '#059669', fontWeight: '600' }}>Muhammad Usman</Text>
              </Text>
            </TouchableOpacity>
          </Card>

          {/* Registration Navigation Link */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.7}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 14, color: '#64748b' }}>
                Don't have an account?{' '}
                <Text style={{ color: '#059669', fontWeight: '700' }}>
                  Register
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
