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
    <View style={{ marginBottom: 16 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
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
              style={{
                width: 68,
                paddingVertical: 12,
                paddingHorizontal: 4,
                borderRadius: 16,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
                borderWidth: 1.5,
                backgroundColor: isSelected ? '#059669' : '#ffffff',
                borderColor: isSelected ? '#059669' : '#e2e8f0',
                shadowColor: isSelected ? '#059669' : '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isSelected ? 0.2 : 0.05,
                shadowRadius: 4,
                elevation: isSelected ? 3 : 1,
              }}
            >
              <Text
                className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-500'
                }`}
                style={{
                  fontSize: 11,
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 4,
                  color: isSelected ? '#d1fae5' : '#64748b',
                }}
              >
                {item.dayLabel}
              </Text>
              <Text
                className={`text-lg font-extrabold ${
                  isSelected ? 'text-white' : 'text-slate-900'
                }`}
                style={{
                  fontSize: 18,
                  fontWeight: '800',
                  color: isSelected ? '#ffffff' : '#0f172a',
                }}
              >
                {item.dayNumber}
              </Text>
              <Text
                className={`text-[10px] font-medium mt-0.5 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-400'
                }`}
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  marginTop: 2,
                  color: isSelected ? '#d1fae5' : '#94a3b8',
                }}
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
