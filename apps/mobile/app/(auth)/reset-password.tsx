import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen } from '../../components/ui/screen';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi, ApiError } from '../../lib/api';

export default function ResetPasswordScreen() {
  const { clinic } = useAuthStore();
  const params = useLocalSearchParams<{ cnic?: string; phone?: string }>();

  const cnic = params.cnic || '';
  const phone = params.phone || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clinicId =
    clinic?.id ||
    process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
    'b398700a-f746-4a45-afc0-b1020cda02a8';

  const handleResetPassword = async () => {
    setErrorMessage(null);

    if (!cnic || !phone) {
      setErrorMessage('Verification credentials missing. Please restart the forgot-password process.');
      return;
    }

    if (newPassword.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(newPassword)) {
      setErrorMessage('Password must be at least 8 characters with at least 1 letter and 1 number');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await patientApi.resetPassword({
        cnic,
        phone,
        new_password: newPassword,
        clinic_id: clinicId,
      });

      if (Platform.OS === 'web') {
        window.alert('Password reset successfully! Please sign in with your new password.');
        router.replace('/(auth)/login');
      } else {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been updated. Please sign in with your new credentials.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to reset password. Please restart the process.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-slate-50" style={{ backgroundColor: '#f8fafc' }}>
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
              <Text style={{ fontSize: 32 }}>🔑</Text>
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
              Create New Password
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
              Set a strong, new password for your Bright Smile Dental account.
            </Text>

            {cnic ? (
              <View
                style={{
                  marginTop: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  backgroundColor: '#f1f5f9',
                  borderRadius: 16,
                }}
              >
                <Text style={{ fontSize: 12, color: '#475569', fontWeight: '500' }}>
                  Verified CNIC: {cnic}
                </Text>
              </View>
            ) : null}
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

            {/* New Password */}
            <View style={{ position: 'relative', marginBottom: 4 }}>
              <Input
                label="New Password"
                placeholder="At least 8 chars (1 letter + 1 number)"
                value={newPassword}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 36,
                  padding: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
                  {showNewPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Confirm New Password */}
            <View style={{ position: 'relative', marginBottom: 16 }}>
              <Input
                label="Confirm New Password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMessage) setErrorMessage(null);
                }}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: 36,
                  padding: 6,
                }}
              >
                <Text style={{ fontSize: 13, color: '#059669', fontWeight: '600' }}>
                  {showConfirmPassword ? 'Hide' : 'Show'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Reset Button */}
            <Button
              title="Reset Password"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              onPress={handleResetPassword}
              style={{
                backgroundColor: '#059669',
                borderRadius: 14,
                marginTop: 4,
              }}
            />
          </Card>

          {/* Restart verification link */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              activeOpacity={0.7}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 13, color: '#64748b' }}>
                Didn't verify yet?{' '}
                <Text style={{ color: '#059669', fontWeight: '600' }}>
                  Restart verification
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </Screen>
  );
}
