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
  Calendar,
} from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { useAuthStore } from '../../lib/auth-store';
import { patientApi } from '../../lib/api';

export default function HomeScreen() {
  const patient = useAuthStore((s) => s.patient);
  const clinic = useAuthStore((s) => s.clinic);

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['patient', 'appointments', 'upcoming'],
    queryFn: () => patientApi.getAppointments('upcoming'),
  });

  const nextAppointment = appointments && appointments.length > 0 ? appointments[0] : null;

  // Placeholder for Phase E as requested
  const handleChatPress = () => {
    Alert.alert(
      'AI Receptionist',
      'Chat with the AI receptionist arrives in Phase E.'
    );
  };

  const handleBookPress = () => {
    router.push('/book-appointment');
  };

  return (
    <Screen scroll className="p-5">
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
        <Text className="text-sm font-bold text-slate-900 mb-2.5">
          Next Appointment
        </Text>
        {isLoading ? (
          <Card className="p-5 items-center justify-center bg-white border border-slate-200">
            <Text className="text-xs text-slate-400">Loading appointments...</Text>
          </Card>
        ) : nextAppointment ? (
          <Card className="bg-emerald-700 border-0 p-5 shadow-sm">
            <View className="flex-row items-center justify-between mb-3">
              <Badge status={nextAppointment.status} className="bg-emerald-800/80 border-emerald-600 text-emerald-100" />
              <Text className="text-xs font-medium text-emerald-200">
                {nextAppointment.operatory_name || 'Clinic Operatory'}
              </Text>
            </View>

            <Text className="text-lg font-bold text-white mb-1">
              {nextAppointment.doctor_name || nextAppointment.dentist_name || 'Dental Consultation'}
            </Text>

            {nextAppointment.reason ? (
              <Text className="text-xs text-emerald-100 mb-3" numberOfLines={1}>
                {nextAppointment.reason}
              </Text>
            ) : null}

            <View className="flex-row items-center pt-2.5 border-t border-emerald-600/60">
              <Clock color="#a7f3d0" size={15} />
              <Text className="text-xs text-emerald-50 ml-2 font-semibold">
                {new Date(nextAppointment.start_time).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })} · {new Date(nextAppointment.start_time).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </Text>
            </View>
          </Card>
        ) : (
          <Card className="p-5 border-dashed border-2 border-slate-200 bg-white">
            <Text className="text-sm font-bold text-slate-800">
              No upcoming appointments
            </Text>
            <Text className="text-xs text-slate-500 mt-1 mb-3.5 leading-relaxed">
              Maintain your oral health with routine dental checkups and cleanings.
            </Text>
            <TouchableOpacity
              onPress={handleBookPress}
              className="self-start bg-emerald-600 px-4 py-2 rounded-xl active:bg-emerald-700"
            >
              <Text className="text-xs font-bold text-white">
                Book Now →
              </Text>
            </TouchableOpacity>
          </Card>
        )}
      </View>

      {/* Quick Actions Grid */}
      <View className="mb-6">
        <Text className="text-sm font-bold text-slate-900 mb-3">
          Quick Actions
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {/* Chat with AI Receptionist (Phase E Placeholder) */}
          <TouchableOpacity
            onPress={handleChatPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
          >
            <Card className="p-4 bg-emerald-50/60 border-emerald-200/80">
              <View className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center mb-2.5">
                <MessageSquare color="#ffffff" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                AI Receptionist
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                24/7 instant chat
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Book Appointment (Now LIVE in Phase C) */}
          <TouchableOpacity
            onPress={handleBookPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <CalendarPlus color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Book Visit
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                Doctor & time slot
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Find Dentists */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/doctors')}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <Users color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Our Dentists
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                Specialists & fees
              </Text>
            </Card>
          </TouchableOpacity>

          {/* My Appointments */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
          >
            <Card className="p-4">
              <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5">
                <CalendarCheck2 color="#059669" size={20} />
              </View>
              <Text className="text-sm font-bold text-slate-900">
                Appointments
              </Text>
              <Text className="text-[11px] text-slate-500 mt-0.5">
                History & status
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clinic Contact Info */}
      <Card className="p-4 mb-8 bg-slate-100/70 border-slate-200">
        <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          Clinic Details
        </Text>
        <View className="flex-row items-center mb-1.5">
          <MapPin color="#64748b" size={15} />
          <Text className="text-xs text-slate-600 ml-2">
            123 Medical Center Blvd, Suite 400
          </Text>
        </View>
        <View className="flex-row items-center">
          <Phone color="#64748b" size={15} />
          <Text className="text-xs text-slate-600 ml-2">
            +92 300 1234567 • Mon – Sat 09:00–19:00
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
