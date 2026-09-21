import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Calendar, DollarSign, Stethoscope, ChevronDown, ChevronUp } from 'lucide-react-native';
import {
  Treatment,
  formatPKR,
  formatProcedureName,
  formatToothFdi,
  formatLocalDate,
} from '../../lib/api';

interface TreatmentCardProps {
  treatment: Treatment;
}

export function TreatmentCard({ treatment }: TreatmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const friendlyName = formatProcedureName(treatment.procedure_code);
  const toothLabel = treatment.tooth_fdi ? `Tooth ${treatment.tooth_fdi}` : 'General Procedure';

  return (
    <View className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3">
      {/* Top row: Name & Cost */}
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5 flex-wrap mb-1">
            <View className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Text className="text-[11px] font-bold text-emerald-800">
                {treatment.procedure_code}
              </Text>
            </View>

            {treatment.tooth_fdi && (
              <View className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                <Text className="text-[11px] font-semibold text-blue-700">
                  {toothLabel}
                </Text>
              </View>
            )}
          </View>

          <Text className="text-base font-bold text-slate-900 leading-snug">
            {friendlyName}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-base font-extrabold text-slate-900">
            {formatPKR(treatment.cost)}
          </Text>
        </View>
      </View>

      {/* Date & Details */}
      <View className="flex-row items-center mt-3 pt-3 border-t border-slate-100 justify-between">
        <View className="flex-row items-center">
          <Calendar size={13} color="#94a3b8" />
          <Text className="text-xs text-slate-500 ml-1.5 font-medium">
            {formatLocalDate(treatment.created_at)}
          </Text>
        </View>

        {treatment.tooth_fdi && (
          <Text className="text-xs text-slate-400 font-medium">
            {formatToothFdi(treatment.tooth_fdi)}
          </Text>
        )}
      </View>

      {/* Clinical Notes */}
      {treatment.notes && (
        <View className="mt-2.5 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100">
          <Text
            numberOfLines={expanded ? undefined : 2}
            className="text-xs text-slate-600 leading-relaxed"
          >
            <Text className="font-semibold text-slate-700">Clinical Note: </Text>
            {treatment.notes}
          </Text>

          {treatment.notes.length > 90 && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="mt-1 flex-row items-center self-start"
            >
              <Text className="text-[11px] font-semibold text-emerald-700 mr-1">
                {expanded ? 'Show less' : 'Read more'}
              </Text>
              {expanded ? (
                <ChevronUp size={12} color="#047857" />
              ) : (
                <ChevronDown size={12} color="#047857" />
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
