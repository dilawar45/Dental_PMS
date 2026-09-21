import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stethoscope, Grid3X3, Receipt } from 'lucide-react-native';

export type RecordsTabType = 'treatments' | 'chart' | 'invoices';

interface RecordsTabsProps {
  activeTab: RecordsTabType;
  onChangeTab: (tab: RecordsTabType) => void;
  counts?: {
    treatments?: number;
    invoices?: number;
  };
}

export function RecordsTabs({
  activeTab,
  onChangeTab,
  counts,
}: RecordsTabsProps) {
  const tabs: Array<{
    id: RecordsTabType;
    label: string;
    icon: React.ComponentType<{ size: number; color: string }>;
    count?: number;
  }> = [
    {
      id: 'treatments',
      label: 'Treatments',
      icon: Stethoscope,
      count: counts?.treatments,
    },
    {
      id: 'chart',
      label: 'Dental Chart',
      icon: Grid3X3,
    },
    {
      id: 'invoices',
      label: 'Invoices',
      icon: Receipt,
      count: counts?.invoices,
    },
  ];

  return (
    <View className="bg-slate-100/90 p-1.5 rounded-2xl flex-row items-center border border-slate-200/60 mb-4">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const IconComponent = tab.icon;

        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChangeTab(tab.id)}
            activeOpacity={0.8}
            className={`flex-1 flex-row items-center justify-center py-2.5 px-2 rounded-xl transition-all ${
              isActive
                ? 'bg-white shadow-sm border border-slate-200/50'
                : 'bg-transparent'
            }`}
          >
            <IconComponent
              size={16}
              color={isActive ? '#059669' : '#64748b'}
            />
            <Text
              numberOfLines={1}
              className={`ml-1.5 text-xs font-semibold ${
                isActive ? 'text-emerald-800' : 'text-slate-600'
              }`}
            >
              {tab.label}
            </Text>

            {tab.count !== undefined && tab.count > 0 && (
              <View
                className={`ml-1 px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-100' : 'bg-slate-200'
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isActive ? 'text-emerald-800' : 'text-slate-600'
                  }`}
                >
                  {tab.count}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
