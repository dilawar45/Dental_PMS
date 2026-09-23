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
      <View className="my-4" style={{ marginVertical: 16 }}>
        <Text
          className="text-2xl font-extrabold text-slate-900"
          style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}
        >
          Our Dental Specialists
        </Text>
        <Text
          className="text-xs text-slate-500 mt-1 leading-relaxed"
          style={{ fontSize: 12, color: '#64748b', marginTop: 4, lineHeight: 18 }}
        >
          Select a verified dental practitioner to schedule an in-clinic consultation.
        </Text>
      </View>

      {isLoading ? (
        <View
          className="py-16 items-center justify-center"
          style={{ paddingVertical: 64, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator size="large" color="#059669" />
          <Text
            className="text-xs font-medium text-slate-400 mt-3"
            style={{ fontSize: 12, fontWeight: '500', color: '#94a3b8', marginTop: 12 }}
          >
            Loading clinic doctors...
          </Text>
        </View>
      ) : isError ? (
        <Card
          className="p-6 items-center my-6 bg-white border border-red-200"
          style={{ padding: 24, alignItems: 'center', marginVertical: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16 }}
        >
          <Text
            className="text-sm text-red-600 font-semibold mb-2"
            style={{ fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 8 }}
          >
            Unable to load doctors list.
          </Text>
          <Text
            className="text-xs text-slate-500 text-center mb-4"
            style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 }}
          >
            Please check your connection and try again.
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-300"
            style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#6ee7b7' }}
          >
            <Text
              className="text-xs font-bold text-emerald-800"
              style={{ fontSize: 12, fontWeight: '700', color: '#065f46' }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </Card>
      ) : !doctors || doctors.length === 0 ? (
        <Card
          className="p-8 items-center my-6 border-dashed border-2 border-slate-200"
          style={{ padding: 32, alignItems: 'center', marginVertical: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 20 }}
        >
          <View
            className="w-16 h-16 rounded-full bg-emerald-50 items-center justify-center mb-3"
            style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
          >
            <Stethoscope color="#059669" size={28} />
          </View>
          <Text
            className="text-base font-bold text-slate-800"
            style={{ fontSize: 16, fontWeight: '700', color: '#1e293b' }}
          >
            No doctors available
          </Text>
          <Text
            className="text-xs text-slate-500 text-center mt-1"
            style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 }}
          >
            Please check back later or contact our reception.
          </Text>
        </Card>
      ) : (
        <View className="space-y-3 mb-8" style={{ marginBottom: 32 }}>
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
