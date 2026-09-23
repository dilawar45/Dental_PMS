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

// Auto-formats digits into Pakistani CNIC format: #####-#######-#
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

export default function RegisterScreen() {
  const { setAuth, clinic } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [consentGranted, setConsentGranted] = useState(true);

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

  const handleRegister = async () => {
    setErrorMessage(null);

    // Client-side validations
    if (fullName.trim().length < 2) {
      setErrorMessage('Full name must be at least 2 characters');
      return;
    }
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
      setErrorMessage('Phone must be a valid Pakistani mobile number (e.g. 03001234567)');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      setErrorMessage('Please enter a valid age between 1 and 120');
      return;
    }

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
      setErrorMessage('Password must be at least 8 characters with at least 1 letter and 1 number');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    if (!consentGranted) {
      setErrorMessage('You must agree to data processing for dental care to register');
      return;
    }

    setLoading(true);
    try {
      const response = await patientApi.register({
        full_name: fullName.trim(),
        cnic: cnic.trim(),
        phone: normalizedPhone,
        age: parsedAge,
        gender,
        email: email.trim().toLowerCase(),
        password,
        clinic_id: clinicId,
      });

      const { token, patient } = response;
      const nameParts = (patient.full_name || fullName).split(' ');
      const firstName = nameParts[0] || fullName;
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
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Registration failed. Please check your details and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen className="bg-slate-50" style={{ backgroundColor: '#f8fafc' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1, padding: 20, paddingTop: 40, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
          {/* Header Branding */}
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <View
              style={{
                width: 56,
                height: 56,
                backgroundColor: '#ecfdf5',
                borderWidth: 1.5,
                borderColor: '#a7f3d0',
                borderRadius: 18,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 26 }}>🦷</Text>
            </View>

            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#0f172a',
                letterSpacing: -0.5,
                marginBottom: 4,
              }}
            >
              Create Patient Account
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b' }}>
              Join Bright Smile Dental for seamless care
            </Text>
          </View>

          {/* Form Card */}
          <Card
            className="p-5 bg-white border border-slate-200 rounded-3xl shadow-sm"
            style={{
              padding: 20,
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

            {/* Full Name */}
            <Input
              label="Full Name"
              placeholder="e.g. Muhammad Tariq"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="words"
            />

            {/* CNIC with auto-format */}
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
              label="Mobile Number"
              placeholder="0300 1234567"
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errorMessage) setErrorMessage(null);
              }}
              keyboardType="phone-pad"
              leftAddon="+92"
            />

            {/* Age & Gender in row */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 6 }}>
                Age & Gender
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 90 }}>
                  <Input
                    placeholder="Age"
                    value={age}
                    onChangeText={(text) => {
                      setAge(text.replace(/\D/g, ''));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                </View>

                {/* Gender Segmented Control */}
                <View
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    backgroundColor: '#f1f5f9',
                    borderRadius: 12,
                    padding: 3,
                    height: 48,
                  }}
                >
                  {(['male', 'female', 'other'] as const).map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => setGender(g)}
                      style={{
                        flex: 1,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 10,
                        backgroundColor: gender === g ? '#ffffff' : 'transparent',
                        shadowColor: gender === g ? '#000' : 'transparent',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: gender === g ? 0.08 : 0,
                        shadowRadius: 2,
                        elevation: gender === g ? 1 : 0,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: gender === g ? '700' : '500',
                          color: gender === g ? '#059669' : '#64748b',
                          textTransform: 'capitalize',
                        }}
                      >
                        {g}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Email */}
            <Input
              label="Email Address"
              placeholder="name@example.com"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (errorMessage) setErrorMessage(null);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Password */}
            <View style={{ position: 'relative', marginBottom: 4 }}>
              <Input
                label="Password"
                placeholder="At least 8 chars (1 letter + 1 number)"
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

            {/* Confirm Password */}
            <View style={{ position: 'relative', marginBottom: 12 }}>
              <Input
                label="Confirm Password"
                placeholder="Re-enter password"
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

            {/* Bilingual Consent Checkbox */}
            <TouchableOpacity
              onPress={() => setConsentGranted(!consentGranted)}
              activeOpacity={0.8}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: '#f8fafc',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 14,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  borderWidth: 2,
                  borderColor: consentGranted ? '#059669' : '#cbd5e1',
                  backgroundColor: consentGranted ? '#059669' : '#ffffff',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                  marginTop: 2,
                }}
              >
                {consentGranted && (
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#334155', lineHeight: 17, marginBottom: 2 }}>
                  I consent to Bright Smile Dental processing my data for dental care and appointments.
                </Text>
                <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
                  میں برائٹ سمائل ڈینٹل کو اپنے علاج کے لیے ڈیٹا استعمال کرنے کی اجازت دیتا/دیتی ہوں۔
                </Text>
              </View>
            </TouchableOpacity>

            {/* Submit Button */}
            <Button
              title="Create Account"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading}
              onPress={handleRegister}
              style={{
                backgroundColor: '#059669',
                borderRadius: 14,
              }}
            />
          </Card>

          {/* Navigation to Login */}
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.7}
              style={{ paddingVertical: 10 }}
            >
              <Text style={{ fontSize: 14, color: '#64748b' }}>
                Already have an account?{' '}
                <Text style={{ color: '#059669', fontWeight: '700' }}>
                  Sign In
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
    </Screen>
  );
}
