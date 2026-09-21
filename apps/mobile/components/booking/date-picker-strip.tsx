import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';

interface DateItem {
  dateString: string; // YYYY-MM-DD
  dayLabel: string; // "Today", "Tomorrow", "Mon", "Tue"
  dayNumber: string; // "22"
  monthLabel: string; // "Sep"
  isToday: boolean;
  isTomorrow: boolean;
}

interface DatePickerStripProps {
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (dateString: string) => void;
  daysCount?: number;
}

export function generateNextDays(count = 14): DateItem[] {
  const items: DateItem[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    let dayLabel = d.toLocaleDateString(undefined, { weekday: 'short' });
    const isToday = i === 0;
    const isTomorrow = i === 1;

    if (isToday) dayLabel = 'Today';
    else if (isTomorrow) dayLabel = 'Tomorrow';

    items.push({
      dateString,
      dayLabel,
      dayNumber: String(d.getDate()),
      monthLabel: d.toLocaleDateString(undefined, { month: 'short' }),
      isToday,
      isTomorrow,
    });
  }

  return items;
}

export function DatePickerStrip({
  selectedDate,
  onSelectDate,
  daysCount = 14,
}: DatePickerStripProps) {
  const dates = React.useMemo(() => generateNextDays(daysCount), [daysCount]);

  return (
    <View className="mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4 }}
      >
        {dates.map((item) => {
          const isSelected = item.dateString === selectedDate;
          return (
            <TouchableOpacity
              key={item.dateString}
              onPress={() => onSelectDate(item.dateString)}
              activeOpacity={0.75}
              className={`w-16 py-3 px-1 rounded-2xl items-center justify-center mr-2.5 border transition-all ${
                isSelected
                  ? 'bg-emerald-600 border-emerald-600 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              <Text
                className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-500'
                }`}
              >
                {item.dayLabel}
              </Text>
              <Text
                className={`text-lg font-extrabold ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
              >
                {item.dayNumber}
              </Text>
              <Text
                className={`text-[10px] font-medium mt-0.5 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-400'
                }`}
              >
                {item.monthLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
