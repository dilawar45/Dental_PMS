import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Clock } from 'lucide-react-native';
import { Slot } from '../../lib/api';

interface SlotGridProps {
  slots: Slot[];
  selectedSlot: Slot | null;
  onSelectSlot: (slot: Slot) => void;
  isLoading?: boolean;
}

export function SlotGrid({
  slots,
  selectedSlot,
  onSelectSlot,
  isLoading = false,
}: SlotGridProps) {
  if (isLoading) {
    return (
      <View className="py-8 items-center justify-center bg-white rounded-2xl border border-slate-200">
        <ActivityIndicator size="small" color="#059669" />
        <Text className="text-xs font-medium text-slate-400 mt-2">
          Checking available slots...
        </Text>
      </View>
    );
  }

  if (!slots || slots.length === 0) {
    return (
      <View className="p-6 items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300">
        <Clock color="#94a3b8" size={24} />
        <Text className="text-sm font-bold text-slate-800 mt-2">
          No slots available
        </Text>
        <Text className="text-xs text-slate-500 text-center mt-1">
          All appointment times on this date are fully booked. Please select another date.
        </Text>
      </View>
    );
  }

  const formatSlotTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View
      className="flex-row flex-wrap justify-between"
      style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}
    >
      {slots.map((slot) => {
        const isSelected =
          selectedSlot?.start === slot.start &&
          selectedSlot?.dentist_id === slot.dentist_id;

        const timeLabel = formatSlotTime(slot.start);

        return (
          <TouchableOpacity
            key={`${slot.start}-${slot.dentist_id}`}
            onPress={() => onSelectSlot(slot)}
            activeOpacity={0.75}
            className={`w-[48%] py-3 px-3 rounded-xl border mb-2.5 items-center justify-center transition-colors ${
              isSelected
                ? 'bg-emerald-600 border-emerald-600 shadow-xs'
                : 'bg-white border-slate-200 active:bg-slate-50'
            }`}
            style={{
              width: '48%',
              paddingVertical: 12,
              paddingHorizontal: 8,
              borderRadius: 14,
              borderWidth: 1.5,
              marginBottom: 10,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isSelected ? '#059669' : '#ffffff',
              borderColor: isSelected ? '#059669' : '#e2e8f0',
              shadowColor: isSelected ? '#059669' : '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isSelected ? 0.15 : 0.03,
              shadowRadius: 3,
              elevation: isSelected ? 2 : 1,
            }}
          >
            <Text
              className={`text-sm font-bold ${
                isSelected ? 'text-white' : 'text-slate-800'
              }`}
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: isSelected ? '#ffffff' : '#1e293b',
              }}
            >
              {timeLabel}
            </Text>
            {slot.dentist_name ? (
              <Text
                numberOfLines={1}
                className={`text-[10px] font-medium mt-0.5 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-400'
                }`}
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  marginTop: 2,
                  color: isSelected ? '#d1fae5' : '#64748b',
                }}
              >
                {slot.dentist_name}
              </Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
