import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
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
import { checkPermissions } from '../../lib/notifications';

export default function HomeScreen() {
  const patient = useAuthStore((s) => s.patient);
  const clinic = useAuthStore((s) => s.clinic);
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    (async () => {
      const { granted, status } = await checkPermissions();
      if (!granted && status === 'denied') {
        setShowPermissionBanner(true);
      }
    })();
  }, []);

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
    <Screen scroll contentContainerStyle={{ padding: 18, paddingTop: 12 }}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between mt-2 mb-6"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 8,
          marginBottom: 20,
        }}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            className="text-xs font-bold text-emerald-700 tracking-wider uppercase"
            style={{
              fontSize: 12,
              fontWeight: '700',
              color: '#047857',
              letterSpacing: 0.8,
              textTransform: 'uppercase',
            }}
          >
            {clinic?.name || 'Bright Smile Dental'}
          </Text>
          <Text
            className="text-2xl font-extrabold text-slate-900 mt-0.5"
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#0f172a',
              marginTop: 2,
            }}
          >
            Hello, {patient?.first_name || 'Patient'} 👋
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/profile')}
          className="w-11 h-11 bg-emerald-100 rounded-full items-center justify-center border border-emerald-200"
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#d1fae5',
            borderWidth: 1.5,
            borderColor: '#a7f3d0',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '800', color: '#065f46' }}>
            {patient?.first_name ? patient.first_name[0] : 'P'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Dismissible Permission Banner */}
      {showPermissionBanner ? (
        <View
          style={{
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            borderWidth: 1,
            borderRadius: 16,
            padding: 14,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1e3a8a' }}>
              🔔 Enable appointment reminders
            </Text>
            <Text style={{ fontSize: 11, color: '#3b82f6', marginTop: 2, lineHeight: 16 }}>
              Turn on notifications to get booking confirmations and appointment reminders.
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={{
                backgroundColor: '#2563eb',
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 8,
              }}
            >
              <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                Settings
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPermissionBanner(false)}
              style={{ padding: 4 }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '700' }}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

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
          <View
            style={{
              backgroundColor: '#047857',
              borderRadius: 20,
              padding: 20,
              shadowColor: '#047857',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: '#065f46',
                  borderColor: '#34d399',
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ color: '#d1fae5', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' }}>
                  {nextAppointment.status}
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#a7f3d0' }}>
                {nextAppointment.operatory_name || 'Clinic Operatory'}
              </Text>
            </View>

            <Text style={{ fontSize: 18, fontWeight: '800', color: '#ffffff', marginBottom: 4 }}>
              {nextAppointment.doctor_name || nextAppointment.dentist_name || 'Dental Consultation'}
            </Text>

            {nextAppointment.reason ? (
              <Text style={{ fontSize: 13, color: '#d1fae5', marginBottom: 12 }} numberOfLines={1}>
                {nextAppointment.reason}
              </Text>
            ) : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(52, 211, 153, 0.3)' }}>
              <Clock color="#a7f3d0" size={15} />
              <Text style={{ fontSize: 12, color: '#ecfdf5', marginLeft: 8, fontWeight: '600' }}>
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
          </View>
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
      <View className="mb-6" style={{ marginBottom: 24 }}>
        <Text
          className="text-sm font-bold text-slate-900 mb-3"
          style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}
        >
          Quick Actions
        </Text>
        <View
          className="flex-row flex-wrap justify-between"
          style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}
        >
          {/* Chat with AI Receptionist (Phase E Placeholder) */}
          <TouchableOpacity
            onPress={handleChatPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
            style={{ width: '48%', marginBottom: 12 }}
          >
            <Card
              className="p-4 bg-emerald-50/60 border-emerald-200/80"
              style={{
                padding: 16,
                backgroundColor: '#f0fdf4',
                borderWidth: 1.5,
                borderColor: '#bbf7d0',
                borderRadius: 18,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl bg-emerald-600 items-center justify-center mb-2.5"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#059669',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <MessageSquare color="#ffffff" size={20} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                AI Receptionist
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                24/7 instant chat
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Book Appointment (Now LIVE in Phase C) */}
          <TouchableOpacity
            onPress={handleBookPress}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
            style={{ width: '48%', marginBottom: 12 }}
          >
            <Card
              className="p-4"
              style={{
                padding: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 18,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#ecfdf5',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <CalendarPlus color="#059669" size={20} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                Book Visit
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Doctor & time slot
              </Text>
            </Card>
          </TouchableOpacity>

          {/* Find Dentists */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/doctors')}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
            style={{ width: '48%', marginBottom: 12 }}
          >
            <Card
              className="p-4"
              style={{
                padding: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 18,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Users color="#059669" size={20} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                Our Dentists
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                Specialists & fees
              </Text>
            </Card>
          </TouchableOpacity>

          {/* My Appointments */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/appointments')}
            activeOpacity={0.8}
            className="w-[48%] mb-3"
            style={{ width: '48%', marginBottom: 12 }}
          >
            <Card
              className="p-4"
              style={{
                padding: 16,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 18,
              }}
            >
              <View
                className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-2.5"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 14,
                  backgroundColor: '#f1f5f9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <CalendarCheck2 color="#059669" size={20} />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                Appointments
              </Text>
              <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                History & status
              </Text>
            </Card>
          </TouchableOpacity>
        </View>
      </View>

      {/* Clinic Contact Info */}
      <Card
        className="p-4 mb-8 bg-slate-100/70 border-slate-200"
        style={{
          padding: 16,
          backgroundColor: '#f8fafc',
          borderWidth: 1,
          borderColor: '#e2e8f0',
          borderRadius: 18,
          marginBottom: 32,
        }}
      >
        <Text
          className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2"
          style={{ fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}
        >
          Clinic Details
        </Text>
        <View
          className="flex-row items-center mb-1.5"
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
        >
          <MapPin color="#64748b" size={15} />
          <Text style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>
            123 Medical Center Blvd, Suite 400
          </Text>
        </View>
        <View
          className="flex-row items-center"
          style={{ flexDirection: 'row', alignItems: 'center' }}
        >
          <Phone color="#64748b" size={15} />
          <Text style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}>
            +92 300 1234567 • Mon – Sat 09:00–19:00
          </Text>
        </View>
      </Card>
    </Screen>
  );
}
