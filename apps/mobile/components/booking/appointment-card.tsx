import React from 'react';
import { View, Text } from 'react-native';
import { Clock, User, FileText, Calendar } from 'lucide-react-native';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Appointment } from '../../lib/api';

interface AppointmentCardProps {
  appointment: Appointment;
}

export function AppointmentCard({ appointment }: AppointmentCardProps) {
  const startDate = new Date(appointment.start_time);
  const localizedDateTime = startDate.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }) + ' · ' + startDate.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Card className="p-4 mb-3.5 border border-slate-200/90 bg-white">
      <View className="flex-row items-center justify-between mb-2.5">
        <View className="flex-row items-center flex-1 mr-2">
          <Calendar color="#059669" size={16} />
          <Text className="text-sm font-bold text-slate-900 ml-2">
            {localizedDateTime}
          </Text>
        </View>
        <Badge status={appointment.status} />
      </View>

      <View className="flex-row items-center mb-1.5">
        <User color="#64748b" size={14} />
        <Text className="text-xs font-semibold text-slate-700 ml-1.5">
          {appointment.doctor_name || appointment.dentist_name || 'Dr. Dental Specialist'}
        </Text>
        <Text className="text-xs text-slate-400 mx-1.5">•</Text>
        <Clock color="#64748b" size={13} />
        <Text className="text-xs text-slate-500 ml-1">30 min</Text>
      </View>

      {appointment.reason ? (
        <View className="flex-row items-start mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
          <FileText color="#94a3b8" size={14} className="mt-0.5" />
          <View className="ml-2 flex-1">
            <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Reason for Visit
            </Text>
            <Text className="text-xs text-slate-800 font-medium mt-0.5">
              {appointment.reason}
            </Text>
          </View>
        </View>
      ) : null}

      {appointment.notes ? (
        <Text className="text-xs text-slate-500 mt-2 italic px-1">
          Note: {appointment.notes}
        </Text>
      ) : null}
    </Card>
  );
}
