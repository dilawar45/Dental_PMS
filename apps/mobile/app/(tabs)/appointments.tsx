import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { patientApi } from '../../lib/api';

type TabFilter = 'all' | 'scheduled' | 'completed';

export default function AppointmentsScreen() {
  const [filter, setFilter] = useState<TabFilter>('all');

  const {
    data: appointments,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['patient', 'appointments', filter],
    queryFn: () => patientApi.getAppointments(filter === 'all' ? undefined : filter),
  });

  const handleBookPress = () => {
    Alert.alert(
      'Appointment Booking',
      'Appointment booking arrives in Phase C.'
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
      case 'confirmed':
        return 'bg-emerald-100 text-emerald-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Screen scroll className="p-6">
      <View className="my-4">
        <Text className="text-2xl font-extrabold text-slate-900">
          My Appointments
        </Text>
        <Text className="text-sm text-slate-500 mt-1">
          Review your upcoming and past dental visits.
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="flex-row bg-slate-200/70 p-1 rounded-xl mb-6">
        {(['all', 'scheduled', 'completed'] as TabFilter[]).map((tab) => {
          const isActive = filter === tab;
          const label =
            tab === 'all' ? 'All' : tab === 'scheduled' ? 'Upcoming' : 'Past';
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => setFilter(tab)}
              className={`flex-1 py-2 items-center rounded-lg ${
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
        <View className="py-12 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="text-sm text-slate-400 mt-3">
            Loading appointments...
          </Text>
        </View>
      ) : isError ? (
        <Card className="p-6 items-center my-6">
          <Text className="text-sm text-red-600 font-medium mb-3">
            Failed to load appointments.
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
      ) : !appointments || appointments.length === 0 ? (
        <Card className="p-8 items-center my-6">
          <View className="w-16 h-16 bg-emerald-50 rounded-full items-center justify-center mb-3">
            <Calendar color="#059669" size={28} />
          </View>
          <Text className="text-base font-bold text-slate-900">
            No appointments found
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1 mb-6 px-4">
            You don't have any {filter === 'all' ? '' : filter} appointments on file.
          </Text>
          <Button
            title="Book a Dental Visit"
            onPress={handleBookPress}
            size="md"
          />
        </Card>
      ) : (
        <View className="space-y-4 mb-8">
          {appointments.map((apt) => (
            <Card key={apt.id} className="p-5 mb-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-base font-bold text-slate-900">
                  {apt.doctor_name || 'General Dental Visit'}
                </Text>
                <View
                  className={`px-2.5 py-1 rounded-full ${getStatusColor(
                    apt.status
                  )}`}
                >
                  <Text className="text-xs font-bold uppercase">
                    {apt.status}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center mb-2">
                <Clock color="#64748b" size={15} />
                <Text className="text-xs text-slate-600 ml-2 font-medium">
                  {new Date(apt.start_time).toLocaleString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {apt.operatory_name ? (
                <View className="flex-row items-center mb-2">
                  <MapPin color="#64748b" size={15} />
                  <Text className="text-xs text-slate-600 ml-2">
                    {apt.operatory_name}
                  </Text>
                </View>
              ) : null}

              {apt.notes ? (
                <Text className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg">
                  Notes: {apt.notes}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}
