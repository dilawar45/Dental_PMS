import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/ui/screen';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuthStore } from '../lib/auth-store';

const DEFAULT_CLINIC_ID =
  process.env.EXPO_PUBLIC_DEFAULT_CLINIC_ID ||
  'b398700a-f746-4a45-afc0-b1020cda02a8';

interface ClinicOption {
  id: string;
  name: string;
  tagline: string;
  address: string;
  phone: string;
  timings: string;
  rating: string;
  doctorsCount: number;
}

const AVAILABLE_CLINICS: ClinicOption[] = [
  {
    id: DEFAULT_CLINIC_ID,
    name: 'Bright Smile Dental',
    tagline: 'Comprehensive Family & Aesthetic Dentistry',
    address: '123 Medical Center Blvd, Suite 400',
    phone: '+92 300 1234567',
    timings: 'Mon – Sat: 9:00 AM – 7:00 PM',
    rating: '4.9 ★ (120+ reviews)',
    doctorsCount: 4,
  },
];

export default function ClinicPickerScreen() {
  const [selectedClinicId, setSelectedClinicId] = useState<string>(DEFAULT_CLINIC_ID);
  const setClinic = useAuthStore((s) => s.setClinic);

  const handleContinue = async () => {
    const chosen = AVAILABLE_CLINICS.find((c) => c.id === selectedClinicId);
    if (!chosen) return;

    await setClinic({
      id: chosen.id,
      name: chosen.name,
    });

    router.push('/(auth)/phone');
  };

  return (
    <Screen scroll className="p-6">
      <View style={{ padding: 24 }}>
        {/* Header Branding */}
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: '#ecfdf5',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: '#a7f3d0',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Text style={{ fontSize: 36 }}>🦷</Text>
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
            Select Your Dental Clinic
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: '#64748b',
              textAlign: 'center',
              marginTop: 6,
              paddingHorizontal: 16,
              lineHeight: 20,
            }}
          >
            Choose your clinic to access your appointments, treatments, and dental records.
          </Text>
        </View>

        {/* Clinics List */}
        <View style={{ marginBottom: 28 }}>
          {AVAILABLE_CLINICS.map((clinic) => {
            const isSelected = clinic.id === selectedClinicId;
            return (
              <TouchableOpacity
                key={clinic.id}
                onPress={() => setSelectedClinicId(clinic.id)}
                activeOpacity={0.88}
              >
                <Card
                  style={{
                    borderWidth: 2,
                    borderColor: isSelected ? '#059669' : '#e2e8f0',
                    backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    shadowColor: isSelected ? '#059669' : '#000000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: isSelected ? 0.12 : 0.04,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 10,
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text
                          style={{
                            fontSize: 19,
                            fontWeight: '700',
                            color: '#0f172a',
                          }}
                        >
                          {clinic.name}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 12,
                          color: '#059669',
                          fontWeight: '600',
                          marginBottom: 8,
                        }}
                      >
                        ✓ Verified Practice • {clinic.doctorsCount} Specialists
                      </Text>
                    </View>

                    {/* Radio indicator */}
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        borderWidth: 2,
                        borderColor: isSelected ? '#059669' : '#cbd5e1',
                        backgroundColor: isSelected ? '#059669' : '#ffffff',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: 2,
                      }}
                    >
                      {isSelected ? (
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: '#ffffff',
                          }}
                        />
                      ) : null}
                    </View>
                  </View>

                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: isSelected ? '#dcfce7' : '#f1f5f9',
                      paddingTop: 12,
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                      📍 {clinic.address}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 18 }}>
                      📞 {clinic.phone}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: '#047857',
                        fontWeight: '600',
                        marginTop: 2,
                      }}
                    >
                      ⏰ {clinic.timings}
                    </Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Continue CTA */}
        <Button
          title="Continue to Patient Portal"
          onPress={handleContinue}
          size="lg"
          disabled={!selectedClinicId}
        />

        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
            🔒 HIPAA & Medical Data Privacy Compliant
          </Text>
          <Text style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
            Dental PMS • Multi-Clinic Cloud Platform
          </Text>
        </View>
      </View>
    </Screen>
  );
}
