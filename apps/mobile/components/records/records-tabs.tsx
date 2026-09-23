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
    <View
      className="bg-slate-100/90 p-1.5 rounded-2xl flex-row items-center border border-slate-200/60 mb-4"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        padding: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
      }}
    >
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
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              paddingHorizontal: 8,
              borderRadius: 12,
              backgroundColor: isActive ? '#ffffff' : 'transparent',
              borderWidth: isActive ? 1 : 0,
              borderColor: isActive ? '#e2e8f0' : 'transparent',
              shadowColor: isActive ? '#000000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: isActive ? 0.06 : 0,
              shadowRadius: 2,
              elevation: isActive ? 1 : 0,
            }}
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
              style={{
                marginLeft: 6,
                fontSize: 12,
                fontWeight: '600',
                color: isActive ? '#065f46' : '#64748b',
              }}
            >
              {tab.label}
            </Text>

            {tab.count !== undefined && tab.count > 0 && (
              <View
                className={`ml-1 px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-emerald-100' : 'bg-slate-200'
                }`}
                style={{
                  marginLeft: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  backgroundColor: isActive ? '#d1fae5' : '#e2e8f0',
                }}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    isActive ? 'text-emerald-800' : 'text-slate-600'
                  }`}
                  style={{
                    fontSize: 10,
                    fontWeight: '700',
                    color: isActive ? '#065f46' : '#64748b',
                  }}
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
