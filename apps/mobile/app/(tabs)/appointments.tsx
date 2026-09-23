import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Plus } from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { AppointmentCard } from '../../components/booking/appointment-card';
import { patientApi } from '../../lib/api';

type TabFilter = 'upcoming' | 'past' | 'all';

export default function AppointmentsScreen() {
  const [filter, setFilter] = useState<TabFilter>('upcoming');

  const {
    data: appointments,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['patient', 'appointments', filter],
    queryFn: () => patientApi.getAppointments(filter),
  });

  const emptyStateConfig = {
    upcoming: {
      title: 'No upcoming appointments',
      desc: 'Schedule your next checkup or consultation with one of our dental specialists.',
      showButton: true,
    },
    past: {
      title: 'No past appointments',
      desc: 'Completed visits and previous clinical records will appear here.',
      showButton: false,
    },
    all: {
      title: 'No appointments on file',
      desc: 'You have not booked any appointments with our clinic yet.',
      showButton: true,
    },
  }[filter];

  return (
    <Screen style={{ backgroundColor: '#f8fafc' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => refetch()}
            tintColor="#059669"
            colors={['#059669']}
          />
        }
      >
        <View
          className="flex-row items-center justify-between my-4"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 16 }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              className="text-2xl font-extrabold text-slate-900"
              style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}
            >
              My Appointments
            </Text>
            <Text
              className="text-xs text-slate-500 mt-1"
              style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}
            >
              Track upcoming visits and treatment appointments.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/book-appointment')}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center shadow-xs"
            style={{
              width: 40,
              height: 40,
              borderRadius: 9999,
              backgroundColor: '#059669',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 3,
              elevation: 2,
            }}
          >
            <Plus color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Tab Filter Switcher */}
        <View
          className="flex-row bg-slate-200/70 p-1 rounded-2xl mb-5"
          style={{
            flexDirection: 'row',
            backgroundColor: '#e2e8f0',
            padding: 4,
            borderRadius: 16,
            marginBottom: 20,
          }}
        >
          {(['upcoming', 'past', 'all'] as TabFilter[]).map((tab) => {
            const isActive = filter === tab;
            const label =
              tab === 'upcoming'
                ? 'Upcoming'
                : tab === 'past'
                ? 'Past'
                : 'All';

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 items-center rounded-xl transition-all ${
                  isActive ? 'bg-white shadow-xs' : ''
                }`}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  alignItems: 'center',
                  borderRadius: 12,
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  shadowColor: isActive ? '#000000' : 'transparent',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: isActive ? 0.08 : 0,
                  shadowRadius: 2,
                  elevation: isActive ? 1 : 0,
                }}
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-slate-900' : 'text-slate-500'
                  }`}
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color: isActive ? '#0f172a' : '#64748b',
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
              Loading your appointments...
            </Text>
          </View>
        ) : isError ? (
          <Card
            className="p-6 items-center my-6 border border-red-200 bg-white"
            style={{ padding: 24, alignItems: 'center', marginVertical: 24, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#fecaca', borderRadius: 16 }}
          >
            <Text
              className="text-sm text-red-600 font-semibold mb-2"
              style={{ fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 8 }}
            >
              Failed to load appointments
            </Text>
            <Text
              className="text-xs text-slate-500 text-center mb-4"
              style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 }}
            >
              Could not retrieve appointments. Please check your network connection.
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
        ) : !appointments || appointments.length === 0 ? (
          <Card
            className="p-8 items-center my-6 border-dashed border-2 border-slate-200 bg-white"
            style={{ padding: 32, alignItems: 'center', marginVertical: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 20, backgroundColor: '#ffffff' }}
          >
            <View
              className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-3"
              style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}
            >
              <Calendar color="#059669" size={28} />
            </View>
            <Text
              className="text-base font-bold text-slate-900"
              style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}
            >
              {emptyStateConfig.title}
            </Text>
            <Text
              className="text-xs text-slate-500 text-center mt-1.5 mb-6 px-4 leading-relaxed"
              style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 6, marginBottom: 24, paddingHorizontal: 16, lineHeight: 18 }}
            >
              {emptyStateConfig.desc}
            </Text>
            {emptyStateConfig.showButton ? (
              <Button
                title="Book an Appointment →"
                onPress={() => router.push('/book-appointment')}
                size="md"
              />
            ) : null}
          </Card>
        ) : (
          <View className="mb-10" style={{ marginBottom: 40 }}>
            {appointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
