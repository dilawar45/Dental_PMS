import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { X, FileText, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { ToothSummary, formatToothFdi } from '../../lib/api';
import { toothConditionColors } from '../../constants/theme';

interface ToothDetailModalProps {
  visible: boolean;
  tooth: ToothSummary | null;
  onClose: () => void;
}

const SURFACE_LABELS: Record<string, string> = {
  whole: 'Entire Tooth (Whole)',
  occlusal: 'Occlusal (Chewing Surface)',
  mesial: 'Mesial (Inward Surface)',
  distal: 'Distal (Outward Surface)',
  buccal: 'Buccal (Cheek Surface)',
  lingual: 'Lingual (Tongue Surface)',
  palatal: 'Palatal (Roof of Mouth)',
  incisal: 'Incisal (Biting Edge)',
  cervical: 'Cervical (Gumline)',
};

export function ToothDetailModal({
  visible,
  tooth,
  onClose,
}: ToothDetailModalProps) {
  if (!tooth) return null;

  const wholeCond = tooth.whole_condition || 'healthy';
  const meta = toothConditionColors[wholeCond.toLowerCase()] || toothConditionColors.healthy!;
  const surfaces = Object.entries(tooth.surfaces || {});

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-slate-900/60 justify-end sm:justify-center p-4">
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-3xl p-5 shadow-2xl max-h-[85%] border border-slate-100">
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
                <View className="flex-row items-center flex-1 mr-3">
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border"
                    style={{
                      backgroundColor: `${meta.hex}20`,
                      borderColor: meta.hex,
                    }}
                  >
                    <Text
                      className="text-base font-black"
                      style={{ color: meta.hex }}
                    >
                      {tooth.tooth_fdi}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-slate-900">
                      Tooth {tooth.tooth_fdi}
                    </Text>
                    <Text className="text-xs text-slate-500 font-medium">
                      {formatToothFdi(tooth.tooth_fdi).replace(`Tooth ${tooth.tooth_fdi} `, '')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
                {/* Whole Condition Banner */}
                <View className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 mb-4 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View
                      className="w-3.5 h-3.5 rounded-full mr-2.5"
                      style={{ backgroundColor: meta.hex }}
                    />
                    <Text className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      Overall Condition
                    </Text>
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-full border"
                    style={{
                      backgroundColor: `${meta.hex}15`,
                      borderColor: meta.hex,
                    }}
                  >
                    <Text
                      className="text-xs font-bold capitalize"
                      style={{ color: meta.hex }}
                    >
                      {meta.label}
                    </Text>
                  </View>
                </View>

                {/* Surface-by-surface conditions */}
                <View className="mb-4">
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Surface Breakdown
                  </Text>

                  {surfaces.length === 0 ? (
                    <View className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center">
                      <CheckCircle2 size={16} color="#10b981" />
                      <Text className="text-xs text-slate-600 ml-2">
                        All surfaces are healthy and intact.
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden">
                      {surfaces.map(([surfaceKey, condition]) => {
                        const surfaceMeta =
                          toothConditionColors[condition.toLowerCase()] ||
                          toothConditionColors.healthy!;
                        const friendlySurface =
                          SURFACE_LABELS[surfaceKey.toLowerCase()] ||
                          `${surfaceKey.charAt(0).toUpperCase() + surfaceKey.slice(1)} Surface`;

                        return (
                          <View
                            key={surfaceKey}
                            className="flex-row items-center justify-between p-3"
                          >
                            <View className="flex-row items-center flex-1 mr-2">
                              <View
                                className="w-2.5 h-2.5 rounded-full mr-2.5"
                                style={{ backgroundColor: surfaceMeta.hex }}
                              />
                              <Text className="text-xs font-semibold text-slate-800">
                                {friendlySurface}
                              </Text>
                            </View>

                            <View
                              className="px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: `${surfaceMeta.hex}15`,
                                borderColor: surfaceMeta.hex,
                              }}
                            >
                              <Text
                                className="text-[11px] font-bold capitalize"
                                style={{ color: surfaceMeta.hex }}
                              >
                                {surfaceMeta.label}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Clinical Notes */}
                <View className="mb-2">
                  <View className="flex-row items-center mb-2">
                    <FileText size={13} color="#94a3b8" />
                    <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">
                      Clinical Observations & Notes
                    </Text>
                  </View>

                  {tooth.latest_note ? (
                    <View className="bg-emerald-50/40 rounded-2xl p-3.5 border border-emerald-100/80">
                      <Text className="text-xs text-slate-700 leading-relaxed font-normal">
                        {tooth.latest_note}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <Text className="text-xs text-slate-400 italic">
                        No specific clinical note recorded for this tooth.
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Dismiss button */}
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                className="mt-4 bg-slate-900 rounded-2xl py-3 items-center"
              >
                <Text className="text-white font-semibold text-sm">
                  Close Details
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
