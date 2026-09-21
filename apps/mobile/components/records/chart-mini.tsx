import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { ToothSummary } from '../../lib/api';
import { toothConditionColors } from '../../constants/theme';
import { ToothDetailModal } from './tooth-detail-modal';
import { Info } from 'lucide-react-native';

interface ChartMiniProps {
  teeth: Record<string, ToothSummary>;
}

// Standard FDI notation arches
const UPPER_ARCH = [
  // Upper Right (Quadrant 1)
  '18', '17', '16', '15', '14', '13', '12', '11',
  // Upper Left (Quadrant 2)
  '21', '22', '23', '24', '25', '26', '27', '28',
];

const LOWER_ARCH = [
  // Lower Right (Quadrant 4)
  '48', '47', '46', '45', '44', '43', '42', '41',
  // Lower Left (Quadrant 3)
  '31', '32', '33', '34', '35', '36', '37', '38',
];

export function ChartMini({ teeth }: ChartMiniProps) {
  const [selectedTooth, setSelectedTooth] = useState<ToothSummary | null>(null);

  const renderToothButton = (fdi: string) => {
    const toothData = teeth[fdi];
    const condition = toothData?.whole_condition?.toLowerCase() || 'healthy';
    const meta = toothConditionColors[condition] || toothConditionColors.healthy!;
    const isTreatedOrAffected = condition !== 'healthy';

    return (
      <TouchableOpacity
        key={fdi}
        onPress={() =>
          setSelectedTooth(
            toothData || {
              tooth_fdi: fdi,
              whole_condition: 'healthy',
              surfaces: {},
              latest_note: null,
            }
          )
        }
        activeOpacity={0.7}
        className="items-center mx-1 my-1"
      >
        <View
          className="w-10 h-11 rounded-xl items-center justify-center border shadow-xs transition-all"
          style={{
            backgroundColor: isTreatedOrAffected ? `${meta.hex}15` : '#f8fafc',
            borderColor: isTreatedOrAffected ? meta.hex : '#e2e8f0',
          }}
        >
          {/* Status colored dot */}
          <View
            className="w-2.5 h-2.5 rounded-full mb-1"
            style={{ backgroundColor: meta.hex }}
          />
          <Text
            className="text-[11px] font-bold"
            style={{ color: isTreatedOrAffected ? meta.hex : '#334155' }}
          >
            {fdi}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm">
      {/* Chart Instruction Header */}
      <View className="flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <View>
          <Text className="text-base font-bold text-slate-900">
            Interactive Dental Odontogram
          </Text>
          <Text className="text-xs text-slate-500 mt-0.5">
            Tap any tooth number to view surfaces and clinical notes
          </Text>
        </View>
        <View className="bg-emerald-50 p-2 rounded-xl">
          <Info size={16} color="#059669" />
        </View>
      </View>

      {/* Upper Arch (Maxilla) */}
      <View className="mb-4">
        <View className="flex-row items-center justify-between mb-2 px-1">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Upper Jaw (Maxilla)
          </Text>
          <Text className="text-[10px] text-slate-400 font-medium">
            Right (18-11) • Left (21-28)
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="py-1"
        >
          <View className="flex-row items-center">
            {UPPER_ARCH.slice(0, 8).map(renderToothButton)}
            <View className="w-2 h-8 bg-slate-200 rounded-full mx-1.5" />
            {UPPER_ARCH.slice(8).map(renderToothButton)}
          </View>
        </ScrollView>
      </View>

      {/* Middle Arch Divider */}
      <View className="relative py-2 items-center justify-center my-1">
        <View className="absolute inset-x-0 h-[1px] bg-slate-200" />
        <View className="bg-white px-3 py-0.5 rounded-full border border-slate-200">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Occlusal Plane
          </Text>
        </View>
      </View>

      {/* Lower Arch (Mandible) */}
      <View className="mb-5 mt-1">
        <View className="flex-row items-center justify-between mb-2 px-1">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Lower Jaw (Mandible)
          </Text>
          <Text className="text-[10px] text-slate-400 font-medium">
            Right (48-41) • Left (31-38)
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="py-1"
        >
          <View className="flex-row items-center">
            {LOWER_ARCH.slice(0, 8).map(renderToothButton)}
            <View className="w-2 h-8 bg-slate-200 rounded-full mx-1.5" />
            {LOWER_ARCH.slice(8).map(renderToothButton)}
          </View>
        </ScrollView>
      </View>

      {/* Color Mapping Legend */}
      <View className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-100">
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
          Condition Legend
        </Text>

        <View className="flex-row flex-wrap gap-x-4 gap-y-2">
          {Object.entries(toothConditionColors).map(([key, meta]) => (
            <View key={key} className="flex-row items-center">
              <View
                className="w-2.5 h-2.5 rounded-full mr-1.5"
                style={{ backgroundColor: meta.hex }}
              />
              <Text className="text-xs font-medium text-slate-600">
                {meta.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tooth Detail Modal */}
      <ToothDetailModal
        visible={!!selectedTooth}
        tooth={selectedTooth}
        onClose={() => setSelectedTooth(null)}
      />
    </View>
  );
}
