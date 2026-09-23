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
    <Card
      className="p-4 mb-3.5 border border-slate-200/90 bg-white"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      <View
        className="flex-row items-center justify-between mb-2.5"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}
      >
        <View
          className="flex-row items-center flex-1 mr-2"
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
        >
          <Calendar color="#059669" size={16} />
          <Text
            className="text-sm font-bold text-slate-900 ml-2"
            style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginLeft: 8 }}
          >
            {localizedDateTime}
          </Text>
        </View>
        <Badge status={appointment.status} />
      </View>

      <View
        className="flex-row items-center mb-1.5"
        style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
      >
        <User color="#64748b" size={14} />
        <Text
          className="text-xs font-semibold text-slate-700 ml-1.5"
          style={{ fontSize: 12, fontWeight: '600', color: '#334155', marginLeft: 6 }}
        >
          {appointment.doctor_name || appointment.dentist_name || 'Dr. Dental Specialist'}
        </Text>
        <Text
          className="text-xs text-slate-400 mx-1.5"
          style={{ fontSize: 12, color: '#94a3b8', marginHorizontal: 6 }}
        >
          •
        </Text>
        <Clock color="#64748b" size={13} />
        <Text
          className="text-xs text-slate-500 ml-1"
          style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}
        >
          30 min
        </Text>
      </View>

      {appointment.reason ? (
        <View
          className="flex-row items-start mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100"
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            marginTop: 8,
            backgroundColor: '#f8fafc',
            padding: 10,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <FileText color="#94a3b8" size={14} style={{ marginTop: 2 }} />
          <View className="ml-2 flex-1" style={{ marginLeft: 8, flex: 1 }}>
            <Text
              className="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
              style={{ fontSize: 10, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}
            >
              Reason for Visit
            </Text>
            <Text
              className="text-xs text-slate-800 font-medium mt-0.5"
              style={{ fontSize: 12, fontWeight: '500', color: '#1e293b', marginTop: 2 }}
            >
              {appointment.reason}
            </Text>
          </View>
        </View>
      ) : null}

      {appointment.notes ? (
        <Text
          className="text-xs text-slate-500 mt-2 italic px-1"
          style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 8, paddingHorizontal: 4 }}
        >
          Note: {appointment.notes}
        </Text>
      ) : null}
    </Card>
  );
}
