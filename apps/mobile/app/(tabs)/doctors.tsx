import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Award, Clock } from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { patientApi, Doctor } from '../../lib/api';

export default function DoctorsScreen() {
  const {
    data: doctors,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient', 'doctors'],
    queryFn: () => patientApi.getDoctors(),
  });

  const handleBookDoctor = (doc: Doctor) => {
    Alert.alert(
      'Book Appointment',
      `Booking an appointment with ${doc.name} will be available in Phase C.`
    );
  };

  return (
    <Screen scroll className="p-6">
      <View className="my-4">
        <Text className="text-2xl font-extrabold text-slate-900">
          Our Dental Specialists
        </Text>
        <Text className="text-sm text-slate-500 mt-1">
          Qualified dental surgeons and specialists dedicated to your oral care.
        </Text>
      </View>

      {isLoading ? (
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-sm text-slate-400 mt-3">
            Loading specialists...
          </Text>
        </View>
      ) : isError ? (
        <Card className="p-6 items-center my-6">
          <Text className="text-sm text-red-600 font-medium mb-3">
            Failed to load doctors list.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-300"
          >
            <Text className="text-xs font-bold text-emerald-800">
              Try Again
            </Text>
          </TouchableOpacity>
        </Card>
      ) : !doctors || doctors.length === 0 ? (
        <Card className="p-8 items-center my-6">
          <Text className="text-3xl mb-2">👨‍⚕️</Text>
          <Text className="text-base font-bold text-slate-800">
            No doctors available
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Please check back later or call our clinic directly.
          </Text>
        </Card>
      ) : (
        <View className="space-y-4 mb-8">
          {doctors.map((doc) => (
            <Card key={doc.id} className="p-5 mb-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-row items-center space-x-3 mb-3">
                  <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center border border-emerald-200">
                    <Text className="text-lg font-bold text-emerald-800">
                      {doc.name.replace(/^Dr\.\s*/i, '')[0] || 'D'}
                    </Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-lg font-bold text-slate-900">
                      {doc.name}
                    </Text>
                    <Text className="text-xs font-semibold text-emerald-700 mt-0.5">
                      {doc.specialty || 'Dental Surgeon'}
                    </Text>
                  </View>
                </View>
              </View>

              {doc.bio ? (
                <Text className="text-xs text-slate-600 mb-3 leading-relaxed">
                  {doc.bio}
                </Text>
              ) : null}

              <View className="flex-row items-center border-t border-slate-100 pt-3 justify-between">
                <View className="flex-row items-center">
                  <Award color="#64748b" size={14} />
                  <Text className="text-xs text-slate-500 ml-1.5 font-medium">
                    {doc.experience_years ? `${doc.experience_years}+ yrs exp` : 'Experienced'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => handleBookDoctor(doc)}
                  className="bg-emerald-600 px-3.5 py-1.5 rounded-lg active:bg-emerald-700"
                >
                  <Text className="text-xs font-semibold text-white">
                    Book Slot
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
