import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Award, Clock, Banknote } from 'lucide-react-native';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Doctor } from '../../lib/api';

interface DoctorCardProps {
  doctor: Doctor;
  onBookPress?: (doctor: Doctor) => void;
  selected?: boolean;
  onSelect?: (doctor: Doctor) => void;
  selectable?: boolean;
}

export function DoctorCard({
  doctor,
  onBookPress,
  selected = false,
  onSelect,
  selectable = false,
}: DoctorCardProps) {
  const initial = (doctor.name.replace(/^Dr\.\s*/i, '')[0] || 'D').toUpperCase();
  const roleLabel = doctor.role === 'owner' ? 'Lead Dental Surgeon (Owner)' : 'Consultant Dentist';

  const content = (
    <Card
      className={`p-4 mb-3 border transition-colors ${
        selected ? 'border-emerald-600 bg-emerald-50/40' : 'border-slate-200/90 bg-white'
      }`}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center flex-1 pr-2">
          <View className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center border border-emerald-200 mr-3">
            <Text className="text-lg font-bold text-emerald-800">{initial}</Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
              {doctor.name}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Badge variant="primary" label={roleLabel} className="mr-2" />
            </View>
          </View>
        </View>

        {selectable ? (
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
          >
            {selected ? <View className="w-2.5 h-2.5 rounded-full bg-white" /> : null}
          </View>
        ) : null}
      </View>

      {doctor.bio ? (
        <Text className="text-xs text-slate-600 mb-3 leading-relaxed" numberOfLines={2}>
          {doctor.bio}
        </Text>
      ) : null}

      <View className="flex-row items-center justify-between pt-2.5 border-t border-slate-100">
        <View className="flex-row items-center">
          <Banknote color="#059669" size={15} />
          <Text className="text-xs font-semibold text-slate-800 ml-1.5">
            Fee: {doctor.fee_currency || 'PKR'} {(doctor.fee ?? 2000).toLocaleString()}
          </Text>
        </View>

        <View className="flex-row items-center">
          <Clock color="#64748b" size={14} />
          <Text className="text-xs text-slate-500 ml-1.5">
            {doctor.weekly_schedule || 'Mon–Sat 09:00–19:00'}
          </Text>
        </View>
      </View>

      {onBookPress && !selectable ? (
        <TouchableOpacity
          onPress={() => onBookPress(doctor)}
          activeOpacity={0.8}
          className="mt-3 bg-emerald-600 py-2.5 px-4 rounded-xl items-center justify-center active:bg-emerald-700"
        >
          <Text className="text-sm font-bold text-white">Book Appointment</Text>
        </TouchableOpacity>
      ) : null}
    </Card>
  );

  if (selectable && onSelect) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onSelect(doctor)}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
