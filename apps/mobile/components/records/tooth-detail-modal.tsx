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
        <View
          className="flex-1 bg-slate-900/60 justify-end sm:justify-center p-4"
          style={{
            flex: 1,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              className="bg-white rounded-3xl p-5 shadow-2xl max-h-[85%] border border-slate-100"
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 24,
                padding: 20,
                maxHeight: '85%',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                elevation: 10,
              }}
            >
              {/* Header */}
              <View
                className="flex-row items-center justify-between pb-3 border-b border-slate-100"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#f1f5f9',
                }}
              >
                <View
                  className="flex-row items-center flex-1 mr-3"
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 }}
                >
                  <View
                    className="w-10 h-10 rounded-2xl items-center justify-center mr-3 border"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: 12,
                      backgroundColor: `${meta.hex}20`,
                      borderColor: meta.hex,
                      borderWidth: 1.5,
                    }}
                  >
                    <Text
                      className="text-base font-black"
                      style={{ color: meta.hex, fontSize: 16, fontWeight: '800' }}
                    >
                      {tooth.tooth_fdi}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className="text-base font-bold text-slate-900"
                      style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}
                    >
                      Tooth {tooth.tooth_fdi}
                    </Text>
                    <Text
                      className="text-xs text-slate-500 font-medium"
                      style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}
                    >
                      {formatToothFdi(tooth.tooth_fdi).replace(`Tooth ${tooth.tooth_fdi} `, '')}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: '#f1f5f9',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={16} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView className="mt-4" style={{ marginTop: 16 }} showsVerticalScrollIndicator={false}>
                {/* Whole Condition Banner */}
                <View
                  className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/70 mb-4 flex-row items-center justify-between"
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View
                      className="w-3.5 h-3.5 rounded-full mr-2.5"
                      style={{
                        width: 14,
                        height: 14,
                        borderRadius: 7,
                        backgroundColor: meta.hex,
                        marginRight: 10,
                      }}
                    />
                    <Text
                      className="text-xs font-semibold text-slate-600 uppercase tracking-wider"
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: '#475569',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                      }}
                    >
                      Overall Condition
                    </Text>
                  </View>

                  <View
                    className="px-2.5 py-1 rounded-full border"
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 999,
                      borderWidth: 1,
                      backgroundColor: `${meta.hex}15`,
                      borderColor: meta.hex,
                    }}
                  >
                    <Text
                      className="text-xs font-bold capitalize"
                      style={{ color: meta.hex, fontSize: 12, fontWeight: '700', textTransform: 'capitalize' }}
                    >
                      {meta.label}
                    </Text>
                  </View>
                </View>

                {/* Surface-by-surface conditions */}
                <View className="mb-4" style={{ marginBottom: 16 }}>
                  <Text
                    className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2"
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 8,
                    }}
                  >
                    Surface Breakdown
                  </Text>

                  {surfaces.length === 0 ? (
                    <View
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        flexDirection: 'row',
                        alignItems: 'center',
                      }}
                    >
                      <CheckCircle2 size={16} color="#10b981" />
                      <Text
                        className="text-xs text-slate-600 ml-2"
                        style={{ fontSize: 12, color: '#475569', marginLeft: 8 }}
                      >
                        All surfaces are healthy and intact.
                      </Text>
                    </View>
                  ) : (
                    <View
                      className="bg-slate-50/80 rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                        overflow: 'hidden',
                      }}
                    >
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
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: 12,
                              borderBottomWidth: 1,
                              borderBottomColor: '#f1f5f9',
                            }}
                          >
                            <View
                              className="flex-row items-center flex-1 mr-2"
                              style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
                            >
                              <View
                                className="w-2.5 h-2.5 rounded-full mr-2.5"
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: surfaceMeta.hex,
                                  marginRight: 10,
                                }}
                              />
                              <Text
                                className="text-xs font-semibold text-slate-800"
                                style={{ fontSize: 12, fontWeight: '600', color: '#1e293b' }}
                              >
                                {friendlySurface}
                              </Text>
                            </View>

                            <View
                              className="px-2 py-0.5 rounded-full border"
                              style={{
                                paddingHorizontal: 8,
                                paddingVertical: 2,
                                borderRadius: 999,
                                borderWidth: 1,
                                backgroundColor: `${surfaceMeta.hex}15`,
                                borderColor: surfaceMeta.hex,
                              }}
                            >
                              <Text
                                className="text-[11px] font-bold capitalize"
                                style={{
                                  fontSize: 11,
                                  fontWeight: '700',
                                  color: surfaceMeta.hex,
                                  textTransform: 'capitalize',
                                }}
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
                <View className="mb-2" style={{ marginBottom: 8 }}>
                  <View
                    className="flex-row items-center mb-2"
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                  >
                    <FileText size={13} color="#94a3b8" />
                    <Text
                      className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1"
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginLeft: 4,
                      }}
                    >
                      Clinical Observations & Notes
                    </Text>
                  </View>

                  {tooth.latest_note ? (
                    <View
                      className="bg-emerald-50/40 rounded-2xl p-3.5 border border-emerald-100/80"
                      style={{
                        backgroundColor: '#f0fdf4',
                        borderRadius: 16,
                        padding: 14,
                        borderWidth: 1,
                        borderColor: '#dcfce7',
                      }}
                    >
                      <Text
                        className="text-xs text-slate-700 leading-relaxed font-normal"
                        style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}
                      >
                        {tooth.latest_note}
                      </Text>
                    </View>
                  ) : (
                    <View
                      className="bg-slate-50 rounded-xl p-3 border border-slate-100"
                      style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: '#f1f5f9',
                      }}
                    >
                      <Text
                        className="text-xs text-slate-400 italic"
                        style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}
                      >
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
                style={{
                  marginTop: 16,
                  backgroundColor: '#0f172a',
                  borderRadius: 16,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
              >
                <Text
                  className="text-white font-semibold text-sm"
                  style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}
                >
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
