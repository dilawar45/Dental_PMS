import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Stethoscope } from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { DoctorCard } from '../../components/booking/doctor-card';
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
    router.push({
      pathname: '/book-appointment',
      params: { dentist_id: doc.id },
    });
  };

  return (
    <Screen scroll contentContainerStyle={{ padding: 18, paddingTop: 14 }}>
      <View className="my-4">
        <Text className="text-2xl font-extrabold text-slate-900">
          Our Dental Specialists
        </Text>
        <Text className="text-xs text-slate-500 mt-1 leading-relaxed">
          Select a verified dental practitioner to schedule an in-clinic consultation.
        </Text>
      </View>

      {isLoading ? (
        <View className="py-16 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-xs font-medium text-slate-400 mt-3">
            Loading clinic doctors...
          </Text>
        </View>
      ) : isError ? (
        <Card className="p-6 items-center my-6 bg-white border border-red-200">
          <Text className="text-sm text-red-600 font-semibold mb-2">
            Unable to load doctors list.
          </Text>
          <Text className="text-xs text-slate-500 text-center mb-4">
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-300"
          >
            <Text className="text-xs font-bold text-emerald-800">
              Retry
            </Text>
          </TouchableOpacity>
        </Card>
      ) : !doctors || doctors.length === 0 ? (
        <Card className="p-8 items-center my-6 border-dashed border-2 border-slate-200">
          <View className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-3">
            <Stethoscope color="#059669" size={28} />
          </View>
          <Text className="text-base font-bold text-slate-800">
            No doctors available
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1">
            Please check back later or contact our reception.
          </Text>
        </Card>
      ) : (
        <View className="space-y-3 mb-8">
          {doctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              onBookPress={handleBookDoctor}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}
