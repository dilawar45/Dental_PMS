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
      style={{
        padding: 16,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? '#059669' : '#e2e8f0',
        backgroundColor: selected ? '#f0fdf4' : '#ffffff',
      }}
    >
      <View
        className="flex-row items-center justify-between mb-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}
      >
        <View
          className="flex-row items-center flex-1 pr-2"
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}
        >
          <View
            className="w-12 h-12 rounded-2xl bg-emerald-100 items-center justify-center border border-emerald-200 mr-3"
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: '#d1fae5',
              borderWidth: 1,
              borderColor: '#a7f3d0',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#065f46' }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              className="text-base font-bold text-slate-900"
              style={{ fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 3 }}
              numberOfLines={1}
            >
              {doctor.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Badge variant="primary" label={roleLabel} />
            </View>
          </View>
        </View>

        {selectable ? (
          <View
            className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
              selected ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300 bg-white'
            }`}
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: selected ? '#059669' : '#cbd5e1',
              backgroundColor: selected ? '#059669' : '#ffffff',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {selected ? (
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ffffff' }} />
            ) : null}
          </View>
        ) : null}
      </View>

      {doctor.bio ? (
        <Text
          className="text-xs text-slate-600 mb-3 leading-relaxed"
          style={{ fontSize: 12, color: '#475569', marginBottom: 10, lineHeight: 18 }}
          numberOfLines={2}
        >
          {doctor.bio}
        </Text>
      ) : null}

      <View
        className="flex-row items-center justify-between pt-2.5 border-t border-slate-100"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Banknote color="#059669" size={15} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1e293b', marginLeft: 6 }}>
            Fee: {doctor.fee_currency || 'PKR'} {(doctor.fee ?? 2000).toLocaleString()}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Clock color="#64748b" size={14} />
          <Text style={{ fontSize: 12, color: '#64748b', marginLeft: 6 }}>
            {doctor.weekly_schedule || 'Mon–Sat 09:00–19:00'}
          </Text>
        </View>
      </View>

      {onBookPress && !selectable ? (
        <TouchableOpacity
          onPress={() => onBookPress(doctor)}
          activeOpacity={0.8}
          className="mt-3 bg-emerald-600 py-2.5 px-4 rounded-xl items-center justify-center active:bg-emerald-700"
          style={{
            marginTop: 12,
            backgroundColor: '#059669',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Book Appointment</Text>
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
