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
    <View
      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3"
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }}
    >
      {/* Top row: Name & Cost */}
      <View
        className="flex-row items-start justify-between gap-2"
        style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <View className="flex-1" style={{ flex: 1, marginRight: 8 }}>
          <View
            className="flex-row items-center gap-1.5 flex-wrap mb-1"
            style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}
          >
            <View
              className="bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: '#ecfdf5',
                borderWidth: 1,
                borderColor: '#a7f3d0',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 9999,
                marginRight: 6,
                marginBottom: 2,
              }}
            >
              <Text
                className="text-[11px] font-bold text-emerald-800"
                style={{ fontSize: 11, fontWeight: '700', color: '#065f46' }}
              >
                {treatment.procedure_code}
              </Text>
            </View>

            {treatment.tooth_fdi && (
              <View
                className="bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: '#eff6ff',
                  borderWidth: 1,
                  borderColor: '#bfdbfe',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 9999,
                  marginBottom: 2,
                }}
              >
                <Text
                  className="text-[11px] font-semibold text-blue-700"
                  style={{ fontSize: 11, fontWeight: '600', color: '#1d4ed8' }}
                >
                  {toothLabel}
                </Text>
              </View>
            )}
          </View>

          <Text
            className="text-base font-bold text-slate-900 leading-snug"
            style={{ fontSize: 16, fontWeight: '700', color: '#0f172a', lineHeight: 22 }}
          >
            {friendlyName}
          </Text>
        </View>

        <View className="items-end" style={{ alignItems: 'flex-end' }}>
          <Text
            className="text-base font-extrabold text-slate-900"
            style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
          >
            {formatPKR(treatment.cost)}
          </Text>
        </View>
      </View>

      {/* Date & Details */}
      <View
        className="flex-row items-center mt-3 pt-3 border-t border-slate-100 justify-between"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
        }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Calendar size={13} color="#94a3b8" />
          <Text
            className="text-xs text-slate-500 ml-1.5 font-medium"
            style={{ fontSize: 12, color: '#64748b', marginLeft: 6, fontWeight: '500' }}
          >
            {formatLocalDate(treatment.created_at)}
          </Text>
        </View>

        {treatment.tooth_fdi && (
          <Text
            className="text-xs text-slate-400 font-medium"
            style={{ fontSize: 12, color: '#94a3b8', fontWeight: '500' }}
          >
            {formatToothFdi(treatment.tooth_fdi)}
          </Text>
        )}
      </View>

      {/* Clinical Notes */}
      {treatment.notes && (
        <View
          className="mt-2.5 bg-slate-50/90 rounded-xl p-2.5 border border-slate-100"
          style={{
            marginTop: 10,
            backgroundColor: '#f8fafc',
            borderRadius: 12,
            padding: 10,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Text
            numberOfLines={expanded ? undefined : 2}
            className="text-xs text-slate-600 leading-relaxed"
            style={{ fontSize: 12, color: '#475569', lineHeight: 18 }}
          >
            <Text
              className="font-semibold text-slate-700"
              style={{ fontWeight: '600', color: '#334155' }}
            >
              Clinical Note:{' '}
            </Text>
            {treatment.notes}
          </Text>

          {treatment.notes.length > 90 && (
            <TouchableOpacity
              onPress={() => setExpanded(!expanded)}
              className="mt-1 flex-row items-center self-start"
              style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
            >
              <Text
                className="text-[11px] font-semibold text-emerald-700 mr-1"
                style={{ fontSize: 11, fontWeight: '600', color: '#047857', marginRight: 4 }}
              >
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
