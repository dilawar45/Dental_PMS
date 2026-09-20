import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  CalendarPlus,
  Users,
  CalendarCheck2,
  Clock,
  MapPin,
  Phone,
} from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi } from '../../lib/api';

export default function HomeScreen() {
  const patient = useAuthStore((s) => s.patient);
  const clinic = useAuthStore((s) => s.clinic);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: () => patientApi.getAppointments('scheduled'),
  });

  const nextAppointment = appointments && appointments.length > 0 ? appointments[0] : null;

  const handleChatPress = () => {
    Alert.alert(
      'AI Receptionist',
      'Chat with the AI receptionist arrives in Phase E.'
    );
  };

  const handleBookPress = () => {
    Alert.alert(
      'Appointment Booking',
      'Online appointment booking arrives in Phase C.'
    );
  };

  return (
    <Screen scroll className="p-6">
      {/* Header */}
      <View className="flex-row items-center justify-between mt-2 mb-6">
        <View>
          <Text className="text-xs font-bold text-emerald-700 tracking-wider uppercase">
            {clinic?.name || 'Bright Smile Dental'}
          </Text>
          <Text className="text-2xl font-extrabold text-slate-900 mt-0.5">
            Hello, {patient?.first_name || 'Patient'} 👋
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          className="w-11 h-11 bg-emerald-100 rounded-full items-center justify-center border border-emerald-200"
        >
          <Text className="text-base font-bold text-emerald-800">
            {patient?.first_name ? patient.first_name[0] : 'P'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Next Appointment Card */}
      <View className="mb-6">
        <Text className="text-sm font-bold text-slate-700 mb-2">
          Next Appointment
        </Text>
        {isLoading ? (
          <Card className="p-4 items-center justify-center">
            <Text className="text-sm text-slate-400">Loading appointments...</Text>
          </Card>
        ) : nextAppointment ? (
          <Card className="bg-emerald-600 border-0 p-5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="bg-emerald-700/80 px-2.5 py-1 rounded-full">
                <Text className="text-xs font-semibold text-emerald-100 uppercase">
                  {nextAppointment.status}
                </Text>
              </View>
              <Text className="text-xs text-emerald-100">
                {nextAppointment.operatory_name || 'Operatory 1'}
              </Text>
            </View>
            <Text className="text-xl font-bold text-white mb-1">
              {nextAppointment.doctor_name || 'Dental Checkup'}
            </Text>
            <View className="flex-row items-center mt-2">
              <Clock color="#d1fae5" size={16} />
              <Text className="text-sm text-emerald-50 ml-2 font-medium">
                {new Date(nextAppointment.start_time).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </Card>
        ) : (
          <Card className="p-5 border-dashed border-2 border-slate-200">
            <Text className="text-base font-semibold text-slate-800">
              No upcoming appointments
            </Text>
            <Text className="text-xs text-slate-500 mt-1 mb-3">
              Maintain your oral health with a routine checkup or cleaning.
            </Text>
            <TouchableOpacity
              onPress={handleBookPress}
              className="self-start bg-emerald-50 px-3.5 py-2 rounded-lg border border-emerald-200"
            >
              <Text className="text-xs font-bold text-emerald-700">
                Book a Visit →
              </Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>

      {/* Quick Actions Grid */}
      <View className="mb-6">
        <Text className="text-sm font-bold text-slate-700 mb-3">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {/* Chat with AI Receptionist (Phase E Placeholder) */}
          <TouchableOpacity
            onPress={handleChatPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3.5"
          >
            <Card className="p-4 bg-emerald-50/50 border-emerald-200">
              <View className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center mb-2.5">
                <MessageSquare color="#ffffff" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                AI Receptionist
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                24/7 instant chat
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Book Appointment (Phase C Placeholder) */}
          <TouchableOpacity
            onPress={handleBookPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3.5"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <CalendarPlus color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Book Visit
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Choose doctor & slot
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Find Dentists */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/doctors')}
            activeOpacity={0.8}
            className="w-[48%] mb-3.5"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <Users color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Our Dentists
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                View specialists
              </Text>
            </Card>
          </TouchableOpacity>

          {/* My Appointments */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            activeOpacity={0.8}
            className="w-[48%] mb-3.5"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <CalendarCheck2 color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Appointments
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                History & status
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clinic Contact Info */}
      <Card className="p-5 mb-8 bg-slate-100/60 border-slate-200">
        <Text className="text-sm font-bold text-slate-800 mb-2">
          Clinic Details
        </Text>
        <View className="flex-row items-center mb-2">
          <MapPin color="#64748b" size={16} />
          <Text className="text-xs text-slate-600 ml-2">
            123 Medical Center Blvd, Suite 400
          </Text>
        </View>
        <View className="flex-row items-center">
          <Phone color="#64748b" size={16} />
          <Text className="text-xs text-slate-600 ml-2">
            +92 300 1234567 • Mon - Sat 9am - 7pm
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
