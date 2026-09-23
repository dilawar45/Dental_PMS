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
      {/* Header: Invoice Number & Status */}
      <View
        className="flex-row items-center justify-between"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View
          className="flex-row items-center flex-1 mr-2"
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}
        >
          <View
            className="w-8 h-8 rounded-xl bg-slate-100 items-center justify-center mr-2.5"
            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
          >
            <Receipt size={16} color="#475569" />
          </View>
          <View>
            <Text
              className="text-sm font-bold text-slate-900"
              style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}
            >
              {invoice.invoice_number}
            </Text>
            <View
              className="flex-row items-center mt-0.5"
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}
            >
              <Calendar size={11} color="#94a3b8" />
              <Text
                className="text-[11px] text-slate-500 ml-1"
                style={{ fontSize: 11, color: '#64748b', marginLeft: 4 }}
              >
                {formatLocalDate(invoice.issued_at)}
              </Text>
            </View>
          </View>
        </View>

        <Badge status={invoice.status} />
      </View>

      {/* Financial Numbers Grid */}
      <View
        className="flex-row items-center justify-between mt-3.5 pt-3 border-t border-slate-100"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 14,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
        }}
      >
        <View>
          <Text
            className="text-[11px] font-medium text-slate-400 uppercase tracking-wider"
            style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Total
          </Text>
          <Text
            className="text-sm font-bold text-slate-800 mt-0.5"
            style={{ fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 2 }}
          >
            {formatPKR(invoice.total)}
          </Text>
        </View>

        <View className="items-center" style={{ alignItems: 'center' }}>
          <Text
            className="text-[11px] font-medium text-slate-400 uppercase tracking-wider"
            style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Paid
          </Text>
          <Text
            className="text-sm font-bold text-emerald-700 mt-0.5"
            style={{ fontSize: 14, fontWeight: '700', color: '#047857', marginTop: 2 }}
          >
            {formatPKR(invoice.paid)}
          </Text>
        </View>

        <View className="items-end" style={{ alignItems: 'flex-end' }}>
          <Text
            className="text-[11px] font-medium text-slate-400 uppercase tracking-wider"
            style={{ fontSize: 11, fontWeight: '500', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}
          >
            Balance Due
          </Text>
          <Text
            className={`text-sm font-extrabold mt-0.5 ${
              hasBalance ? 'text-rose-600' : 'text-slate-500'
            }`}
            style={{
              fontSize: 14,
              fontWeight: '800',
              marginTop: 2,
              color: hasBalance ? '#e11d48' : '#64748b',
            }}
          >
            {formatPKR(invoice.balance)}
          </Text>
        </View>
      </View>

      {/* Footer tap cue */}
      <View
        className="flex-row items-center justify-end mt-2.5 pt-2 border-t border-slate-50"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'flex-end',
          marginTop: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#f8fafc',
        }}
      >
        <Text
          className="text-xs font-semibold text-emerald-700 mr-1"
          style={{ fontSize: 12, fontWeight: '600', color: '#047857', marginRight: 4 }}
        >
          View Invoice & Receipts
        </Text>
        <ChevronRight size={14} color="#047857" />
      </View>
    </TouchableOpacity>
  );
}
