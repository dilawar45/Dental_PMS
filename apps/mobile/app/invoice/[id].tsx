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
    <Screen className="p-5">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View className="flex-row items-center justify-between my-3">
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
          >
            <ArrowLeft size={18} color="#334155" />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="text-base font-extrabold text-slate-900">
              {invoice.invoice_number}
            </Text>
            <Text className="text-[11px] text-slate-400">
              Tax Invoice Statement
            </Text>
          </View>

          <Badge status={invoice.status} />
        </View>

        {/* Clinic & Date Header Card */}
        <View className="bg-white rounded-3xl border border-slate-200/80 p-5 mt-2 mb-4 shadow-sm">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base font-bold text-slate-900">
                Bright Smile Dental Clinic
              </Text>
              <Text className="text-xs text-slate-500 mt-0.5">
                Specialized Oral & Maxillofacial Care
              </Text>
            </View>
            <View className="w-10 h-10 rounded-2xl bg-emerald-50 items-center justify-center border border-emerald-100">
              <Building2 size={20} color="#059669" />
            </View>
          </View>

          <View className="flex-row items-center mt-4 pt-4 border-t border-slate-100 justify-between">
            <View className="flex-row items-center">
              <Calendar size={13} color="#94a3b8" />
              <Text className="text-xs text-slate-500 ml-1.5 font-medium">
                Issue Date: {formatLocalDate(invoice.issued_at)}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Clock size={13} color="#94a3b8" />
              <Text className="text-xs text-slate-500 ml-1 font-medium capitalize">
                Status: {invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Line Items Table */}
        <View className="bg-white rounded-3xl border border-slate-200/80 p-5 mb-4 shadow-sm">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Billed Services & Procedures
          </Text>

          {/* Table Header */}
          <View className="flex-row items-center justify-between pb-2 border-b border-slate-200">
            <Text className="flex-1 text-[11px] font-bold text-slate-500 uppercase">
              Description
            </Text>
            <Text className="w-12 text-center text-[11px] font-bold text-slate-500 uppercase">
              Qty
            </Text>
            <Text className="w-24 text-right text-[11px] font-bold text-slate-500 uppercase">
              Subtotal
            </Text>
          </View>

          {/* Table Rows */}
          {invoice.items.length === 0 ? (
            <View className="py-4 items-center">
              <Text className="text-xs text-slate-400 italic">
                Standard dental clinical charges
              </Text>
            </View>
          ) : (
            invoice.items.map((item, idx) => (
              <View
                key={idx}
                className="flex-row items-center justify-between py-3 border-b border-slate-100"
              >
                <View className="flex-1 pr-2">
                  <Text className="text-xs font-bold text-slate-800">
                    {item.description}
                  </Text>
                  {item.quantity > 1 && (
                    <Text className="text-[10px] text-slate-400 mt-0.5">
                      {formatPKR(item.amount)} each
                    </Text>
                  )}
                </View>
                <Text className="w-12 text-center text-xs text-slate-600 font-semibold">
                  {item.quantity}
                </Text>
                <Text className="w-24 text-right text-xs font-extrabold text-slate-900">
                  {formatPKR(item.subtotal)}
                </Text>
              </View>
            ))
          )}

          {/* Financial Calculation Breakdown */}
          <View className="mt-4 pt-2 space-y-2">
            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-slate-500 font-medium">Subtotal</Text>
              <Text className="text-xs text-slate-700 font-bold">
                {formatPKR(invoice.subtotal)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-slate-500 font-medium">
                Provincial Services Tax (5.0%)
              </Text>
              <Text className="text-xs text-slate-700 font-bold">
                {formatPKR(invoice.tax)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2 border-t border-slate-200">
              <Text className="text-sm font-extrabold text-slate-900">
                Invoice Total
              </Text>
              <Text className="text-base font-black text-slate-900">
                {formatPKR(invoice.total)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-1">
              <Text className="text-xs text-emerald-700 font-semibold">
                Amount Paid
              </Text>
              <Text className="text-xs text-emerald-700 font-bold">
                - {formatPKR(invoice.paid)}
              </Text>
            </View>

            <View className="flex-row items-center justify-between py-2.5 bg-slate-50 px-3 rounded-2xl border border-slate-200/70 mt-1">
              <Text className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Balance Due
              </Text>
              <Text
                className={`text-base font-black ${
                  hasBalance ? 'text-rose-600' : 'text-emerald-700'
                }`}
              >
                {formatPKR(invoice.balance)}
              </Text>
            </View>
          </View>
        </View>

        {/* Linked Receipts Section */}
        <View className="bg-white rounded-3xl border border-slate-200/80 p-5 mb-8 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center">
              <Receipt size={16} color="#059669" />
              <Text className="text-sm font-bold text-slate-900 ml-2">
                Official Payment Receipts
              </Text>
            </View>
            <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <Text className="text-[10px] font-bold text-emerald-800">
                {receipts.length} {receipts.length === 1 ? 'Receipt' : 'Receipts'}
              </Text>
            </View>
          </View>

          {receipts.length === 0 ? (
            <View className="bg-slate-50 rounded-2xl p-4 border border-slate-100 items-center">
              <Text className="text-xs text-slate-500 text-center">
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
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <FileCheck size={16} color="#059669" />
                      <Text className="text-xs font-extrabold text-slate-900 ml-1.5">
                        {rcpt.receipt_number}
                      </Text>
                    </View>
                    <Text className="text-xs font-bold text-emerald-700">
                      {formatPKR(rcpt.amount)}
                    </Text>
                  </View>

                  <View className="flex-row items-center justify-between mt-1 pt-2 border-t border-slate-200/50">
                    <Text className="text-[11px] text-slate-500">
                      {formatLocalDate(rcpt.created_at || invoice.issued_at)}
                    </Text>

                    <TouchableOpacity
                      onPress={() => handleDownloadReceipt(rcpt)}
                      disabled={isDownloading}
                      activeOpacity={0.8}
                      className="flex-row items-center bg-emerald-600 px-3 py-1.5 rounded-xl shadow-xs"
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Download size={12} color="#ffffff" />
                          <Text className="text-xs font-bold text-white ml-1.5">
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
