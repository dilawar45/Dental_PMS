import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import {
  ArrowLeft,
  Calendar,
  Download,
  Receipt,
  AlertCircle,
  FileCheck,
  Building2,
  Clock,
} from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { patientApi, formatPKR, formatLocalDate, InvoiceReceipt } from '../../lib/api';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [downloadingReceiptId, setDownloadingReceiptId] = useState<string | null>(null);

  const {
    data: invoice,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patient-invoice', id],
    queryFn: () => patientApi.getInvoiceById(id!),
    enabled: !!id,
  });

  const handleDownloadReceipt = async (receipt: InvoiceReceipt) => {
    try {
      setDownloadingReceiptId(receipt.id);
      const res = await patientApi.getReceipt(receipt.id);

      if (res.url.startsWith('mock://')) {
        Alert.alert(
          'Receipt Download',
          'Receipt PDF available after credentials are configured'
        );
      } else {
        const canOpen = await Linking.canOpenURL(res.url);
        if (canOpen) {
          await Linking.openURL(res.url);
        } else {
          Alert.alert(
            'Receipt Ready',
            `Receipt PDF link: ${res.url}`
          );
        }
      }
    } catch (err: unknown) {
      // In dev mode with mock storage, fallback to prompt message
      Alert.alert(
        'Receipt Download',
        'Receipt PDF available after credentials are configured'
      );
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  if (isLoading) {
    return (
      <Screen className="p-5 items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-xs text-slate-500 mt-3 font-medium">
          Loading invoice details...
        </Text>
      </Screen>
    );
  }

  if (isError || !invoice) {
    return (
      <Screen className="p-5">
        <View className="flex-row items-center mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center mr-3"
          >
            <ArrowLeft size={18} color="#334155" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-slate-900">
            Invoice Not Found
          </Text>
        </View>

        <View className="bg-red-50 border border-red-200 rounded-2xl p-6 items-center my-6">
          <AlertCircle size={36} color="#dc2626" />
          <Text className="text-sm font-bold text-red-900 mt-2">
            Failed to load invoice
          </Text>
          <Text className="text-xs text-red-700 text-center mt-1 mb-5">
            {error instanceof Error ? error.message : 'The requested invoice could not be found.'}
          </Text>
          <Button variant="outline" size="sm" onPress={() => refetch()}>
            Try Again
          </Button>
        </View>
      </Screen>
    );
  }

  const receipts = invoice.receipts || [];
  const hasBalance = invoice.balance > 0;

  return (
    <Screen style={{ backgroundColor: '#f8fafc' }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingTop: 14, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View
          className="flex-row items-center justify-between my-3"
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 12 }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
            style={{ width: 40, height: 40, borderRadius: 9999, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
          >
            <ArrowLeft size={18} color="#334155" />
          </TouchableOpacity>

          <View className="items-center" style={{ alignItems: 'center' }}>
            <Text
              className="text-base font-extrabold text-slate-900"
              style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}
            >
              {invoice.invoice_number}
            </Text>
            <Text
              className="text-[11px] text-slate-400"
              style={{ fontSize: 11, color: '#94a3b8' }}
            >
              Tax Invoice Statement
            </Text>
          </View>

          <Badge status={invoice.status} />
        </View>

        {/* Clinic & Date Header Card */}
        <View
          className="bg-white rounded-3xl border border-slate-200/80 p-5 mt-2 mb-4 shadow-sm"
          style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginTop: 8, marginBottom: 16 }}
        >
          <View
            className="flex-row items-start justify-between"
            style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <View className="flex-1 mr-3" style={{ flex: 1, marginRight: 12 }}>
              <Text
                className="text-base font-bold text-slate-900"
                style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}
              >
                Bright Smile Dental Clinic
              </Text>
              <Text
                className="text-xs text-slate-500 mt-0.5"
                style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}
              >
                Specialized Oral & Maxillofacial Care
              </Text>
            </View>
            <View
              className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center border border-emerald-100"
              style={{ width: 40, height: 40, borderRadius: 16, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#d1fae5' }}
            >
              <Building2 size={20} color="#059669" />
            </View>
          </View>

          <View
            className="flex-row items-center mt-4 pt-4 border-t border-slate-100 justify-between"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}
          >
            <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Calendar size={13} color="#94a3b8" />
              <Text
                className="text-xs text-slate-500 ml-1.5 font-medium"
                style={{ fontSize: 12, color: '#64748b', marginLeft: 6, fontWeight: '500' }}
              >
                Issue Date: {formatLocalDate(invoice.issued_at)}
              </Text>
            </View>

            <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Clock size={13} color="#94a3b8" />
              <Text
                className="text-xs text-slate-500 ml-1 font-medium capitalize"
                style={{ fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '500', textTransform: 'capitalize' }}
              >
                Status: {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View
          className="bg-white rounded-3xl border border-slate-200/80 p-5 mb-4 shadow-sm"
          style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 16 }}
        >
          <Text
            className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3"
            style={{ fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}
          >
            Billed Services & Procedures
          </Text>

          {/* Table Header */}
          <View
            className="flex-row items-center justify-between pb-2 border-b border-slate-200"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}
          >
            <Text
              className="flex-1 text-[11px] font-bold text-slate-500 uppercase"
              style={{ flex: 1, fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}
            >
              Description
            </Text>
            <Text
              className="w-12 text-center text-[11px] font-bold text-slate-500 uppercase"
              style={{ width: 48, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}
            >
              Qty
            </Text>
            <Text
              className="w-24 text-right text-[11px] font-bold text-slate-500 uppercase"
              style={{ width: 96, textAlign: 'right', fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}
            >
              Subtotal
            </Text>
          </View>

          {/* Table Rows */}
          {invoice.items.length === 0 ? (
            <View className="py-4 items-center" style={{ paddingVertical: 16, alignItems: 'center' }}>
              <Text className="text-xs text-slate-400 italic" style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                Standard dental clinical charges
              </Text>
            </View>
          ) : (
            invoice.items.map((item, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between py-3 border-b border-slate-100"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
              >
                <View className="flex-1 pr-2" style={{ flex: 1, paddingRight: 8 }}>
                  <Text
                    className="text-xs font-bold text-slate-800"
                    style={{ fontSize: 12, fontWeight: '700', color: '#1e293b' }}
                  >
                    {item.description}
                  </Text>
                  {item.quantity > 1 && (
                    <Text
                      className="text-[10px] text-slate-400 mt-0.5"
                      style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}
                    >
                      {formatPKR(item.amount)} each
                    </Text>
                  )}
                </View>
                <Text
                  className="w-12 text-center text-xs text-slate-600 font-semibold"
                  style={{ width: 48, textAlign: 'center', fontSize: 12, color: '#475569', fontWeight: '600' }}
                >
                  {item.quantity}
                </Text>
                <Text
                  className="w-24 text-right text-xs font-extrabold text-slate-900"
                  style={{ width: 96, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#0f172a' }}
                >
                  {formatPKR(item.subtotal)}
                </Text>
              </View>
            ))
          )}

          {/* Financial Calculation Breakdown */}
          <View className="mt-4 pt-2 space-y-2" style={{ marginTop: 16, paddingTop: 8 }}>
            <View
              className="flex-row items-center justify-between py-1"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text className="text-xs text-slate-500 font-medium" style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Subtotal</Text>
              <Text className="text-xs text-slate-700 font-bold" style={{ fontSize: 12, color: '#334155', fontWeight: '700' }}>
                {formatPKR(invoice.subtotal)}
              </Text>
            </View>

            <View
              className="flex-row items-center justify-between py-1"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text className="text-xs text-slate-500 font-medium" style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>
                Provincial Services Tax (5.0%)
              </Text>
              <Text className="text-xs text-slate-700 font-bold" style={{ fontSize: 12, color: '#334155', fontWeight: '700' }}>
                {formatPKR(invoice.tax)}
              </Text>
            </View>

            <View
              className="flex-row items-center justify-between py-2 border-t border-slate-200"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}
            >
              <Text className="text-sm font-extrabold text-slate-900" style={{ fontSize: 14, fontWeight: '800', color: '#0f172a' }}>
                Invoice Total
              </Text>
              <Text className="text-base font-black text-slate-900" style={{ fontSize: 16, fontWeight: '900', color: '#0f172a' }}>
                {formatPKR(invoice.total)}
              </Text>
            </View>

            <View
              className="flex-row items-center justify-between py-1"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              <Text className="text-xs text-emerald-700 font-semibold" style={{ fontSize: 12, color: '#047857', fontWeight: '600' }}>
                Amount Paid
              </Text>
              <Text className="text-xs text-emerald-700 font-bold" style={{ fontSize: 12, color: '#047857', fontWeight: '700' }}>
                - {formatPKR(invoice.paid)}
              </Text>
            </View>

            <View
              className="flex-row items-center justify-between py-2.5 bg-slate-50 px-3 rounded-2xl border border-slate-200/70 mt-1"
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 4 }}
            >
              <Text
                className="text-xs font-bold text-slate-700 uppercase tracking-wider"
                style={{ fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                Balance Due
              </Text>
              <Text
                className={`text-base font-black ${
                  hasBalance ? 'text-rose-600' : 'text-emerald-700'
                }`}
                style={{
                  fontSize: 16,
                  fontWeight: '900',
                  color: hasBalance ? '#e11d48' : '#047857',
                }}
              >
                {formatPKR(invoice.balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Linked Receipts Section */}
        <View
          className="bg-white rounded-3xl border border-slate-200/80 p-5 mb-8 shadow-sm"
          style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#e2e8f0', padding: 20, marginBottom: 32 }}
        >
          <View
            className="flex-row items-center justify-between mb-3"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}
          >
            <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Receipt size={16} color="#059669" />
              <Text
                className="text-sm font-bold text-slate-900 ml-2"
                style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginLeft: 8 }}
              >
                Official Payment Receipts
              </Text>
            </View>
            <View
              className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
              style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: '#a7f3d0' }}
            >
              <Text
                className="text-[10px] font-bold text-emerald-800"
                style={{ fontSize: 10, fontWeight: '700', color: '#065f46' }}
              >
                {receipts.length} {receipts.length === 1 ? 'Receipt' : 'Receipts'}
              </Text>
            </View>
          </View>

          {receipts.length === 0 ? (
            <View
              className="bg-slate-50 rounded-2xl p-4 border border-slate-100 items-center"
              style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' }}
            >
              <Text className="text-xs text-slate-500 text-center" style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
                No payment receipts issued yet. Receipts will appear here once
                payment is processed.
              </Text>
            </View>
          ) : (
            receipts.map((rcpt) => {
              const isDownloading = downloadingReceiptId === rcpt.id;

              return (
                <View
                  key={rcpt.id}
                  className="bg-slate-50/90 rounded-2xl p-4 border border-slate-200/70 mb-2.5"
                  style={{ backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 10 }}
                >
                  <View
                    className="flex-row items-center justify-between mb-2"
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}
                  >
                    <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <FileCheck size={16} color="#059669" />
                      <Text
                        className="text-xs font-extrabold text-slate-900 ml-1.5"
                        style={{ fontSize: 12, fontWeight: '800', color: '#0f172a', marginLeft: 6 }}
                      >
                        {rcpt.receipt_number}
                      </Text>
                    </View>
                    <Text
                      className="text-xs font-bold text-emerald-700"
                      style={{ fontSize: 12, fontWeight: '700', color: '#047857' }}
                    >
                      {formatPKR(rcpt.amount)}
                    </Text>
                  </View>

                  <View
                    className="flex-row items-center justify-between mt-1 pt-2 border-t border-slate-200/50"
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}
                  >
                    <Text className="text-[11px] text-slate-500" style={{ fontSize: 11, color: '#64748b' }}>
                      {formatLocalDate(rcpt.created_at || invoice.issued_at)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleDownloadReceipt(rcpt)}
                      disabled={isDownloading}
                      activeOpacity={0.8}
                      className="flex-row items-center bg-emerald-600 px-3 py-1.5 rounded-xl shadow-xs"
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#059669', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Download size={12} color="#ffffff" />
                          <Text
                            className="text-xs font-bold text-white ml-1.5"
                            style={{ fontSize: 12, fontWeight: '700', color: '#ffffff', marginLeft: 6 }}
                          >
                            Download Receipt
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
