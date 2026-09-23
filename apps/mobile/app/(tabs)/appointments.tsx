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
        <View className="flex-row items-center justify-between my-4">
          <View>
            <Text className="text-2xl font-extrabold text-slate-900">
              My Appointments
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              Track upcoming visits and treatment appointments.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/book-appointment')}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center shadow-xs"
          >
            <Plus color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Tab Filter Switcher */}
        <View className="flex-row bg-slate-200/70 p-1 rounded-2xl mb-5">
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
              >
                <Text
                  className={`text-xs font-bold ${
                    isActive ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View className="py-16 items-center justify-center">
            <ActivityIndicator size="large" color="#059669" />
            <Text className="text-xs font-medium text-slate-400 mt-3">
              Loading your appointments...
            </Text>
          </View>
        ) : isError ? (
          <Card className="p-6 items-center my-6 border border-red-200 bg-white">
            <Text className="text-sm text-red-600 font-semibold mb-2">
              Failed to load appointments
            </Text>
            <Text className="text-xs text-slate-500 text-center mb-4">
              Could not retrieve appointments. Please check your network connection.
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
        ) : !appointments || appointments.length === 0 ? (
          <Card className="p-8 items-center my-6 border-dashed border-2 border-slate-200 bg-white">
            <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-3">
              <Calendar color="#059669" size={28} />
            </View>
            <Text className="text-base font-bold text-slate-900">
              {emptyStateConfig.title}
            </Text>
            <Text className="text-xs text-slate-500 text-center mt-1.5 mb-6 px-4 leading-relaxed">
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
          <View className="mb-10">
            {appointments.map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
