import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Calendar, ChevronRight, Receipt } from 'lucide-react-native';
import { Invoice, formatPKR, formatLocalDate } from '../../lib/api';
import { Badge } from '../ui/badge';

interface InvoiceCardProps {
  invoice: Invoice;
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  const hasBalance = invoice.balance > 0;

  const handlePress = () => {
    router.push({
      pathname: '/invoice/[id]',
      params: { id: invoice.id },
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.85}
      className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm mb-3"
    >
      {/* Header: Invoice Number & Status */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-2.5">
            <Receipt size={16} color="#475569" />
          </View>
          <View>
            <Text className="text-sm font-bold text-slate-900">
              {invoice.invoice_number}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Calendar size={11} color="#94a3b8" />
              <Text className="text-[11px] text-slate-500 ml-1">
                {formatLocalDate(invoice.issued_at)}
              </Text>
            </View>
          </View>
        </View>

        <Badge status={invoice.status} />
      </View>

      {/* Financial Numbers Grid */}
      <View className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100">
        <View>
          <Text className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Total
          </Text>
          <Text className="text-sm font-bold text-slate-800 mt-0.5">
            {formatPKR(invoice.total)}
          </Text>
        </View>

        <View className="items-center">
          <Text className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Paid
          </Text>
          <Text className="text-sm font-bold text-emerald-700 mt-0.5">
            {formatPKR(invoice.paid)}
          </Text>
        </View>

        <View className="items-end">
          <Text className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Balance Due
          </Text>
          <Text
            className={`text-sm font-extrabold mt-0.5 ${
              hasBalance ? 'text-rose-600' : 'text-slate-500'
            }`}
          >
            {formatPKR(invoice.balance)}
          </Text>
        </View>
      </View>

      {/* Footer tap cue */}
      <View className="flex-row items-center justify-end mt-2.5 pt-2 border-t border-slate-50">
        <Text className="text-xs font-semibold text-emerald-700 mr-1">
          View Invoice & Receipts
        </Text>
        <ChevronRight size={14} color="#047857" />
      </View>
    </TouchableOpacity>
  );
}
