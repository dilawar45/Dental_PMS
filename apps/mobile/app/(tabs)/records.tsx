import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  AlertCircle,
  RefreshCw,
  Plus,
  Coins,
  Receipt,
  Stethoscope,
  Smile,
  CreditCard,
} from 'lucide-react-native';
import { Screen } from '../../components/ui/screen';
import { Button } from '../../components/ui/button';
import { patientApi, formatPKR } from '../../lib/api';
import {
  RecordsTabs,
  RecordsTabType,
} from '../../components/records/records-tabs';
import { TreatmentCard } from '../../components/records/treatment-card';
import { ChartMini } from '../../components/records/chart-mini';
import { InvoiceCard } from '../../components/records/invoice-card';

export default function RecordsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<RecordsTabType>('treatments');

  useEffect(() => {
    if (
      params.tab &&
      (params.tab === 'treatments' ||
        params.tab === 'chart' ||
        params.tab === 'invoices')
    ) {
      setActiveTab(params.tab as RecordsTabType);
    }
  }, [params.tab]);

  // 1. Treatments Query
  const {
    data: treatmentsData,
    isLoading: isLoadingTreatments,
    isError: isErrorTreatments,
    error: treatmentsError,
    refetch: refetchTreatments,
    isRefetching: isRefetchingTreatments,
  } = useQuery({
    queryKey: ['patient-treatments'],
    queryFn: patientApi.getTreatments,
  });

  // 2. Chart Query
  const {
    data: chartData,
    isLoading: isLoadingChart,
    isError: isErrorChart,
    error: chartError,
    refetch: refetchChart,
    isRefetching: isRefetchingChart,
  } = useQuery({
    queryKey: ['patient-chart'],
    queryFn: patientApi.getChart,
  });

  // 3. Invoices Query
  const {
    data: invoicesData,
    isLoading: isLoadingInvoices,
    isError: isErrorInvoices,
    error: invoicesError,
    refetch: refetchInvoices,
    isRefetching: isRefetchingInvoices,
  } = useQuery({
    queryKey: ['patient-invoices'],
    queryFn: patientApi.getInvoices,
  });

  const treatments = treatmentsData?.treatments || [];
  const teeth = chartData?.teeth || {};
  const invoices = invoicesData?.invoices || [];

  const isRefreshing =
    isRefetchingTreatments || isRefetchingChart || isRefetchingInvoices;

  const handleRefreshAll = () => {
    if (activeTab === 'treatments') refetchTreatments();
    else if (activeTab === 'chart') refetchChart();
    else if (activeTab === 'invoices') refetchInvoices();
  };

  // Calculations for summaries
  const totalSpent = treatments.reduce((sum, t) => sum + (t.cost || 0), 0);
  const totalBilled = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalOutstanding = invoices.reduce(
    (sum, inv) => sum + (inv.balance || 0),
    0
  );

  return (
    <Screen className="p-5">
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshAll}
            tintColor="#059669"
            colors={['#059669']}
          />
        }
      >
        {/* Screen Header */}
        <View className="flex-row items-center justify-between my-4">
          <View className="flex-1 mr-2">
            <Text className="text-2xl font-extrabold text-slate-900">
              Medical Records
            </Text>
            <Text className="text-xs text-slate-500 mt-1">
              Your clinical history, tooth chart, and billing records.
            </Text>
          </View>
        </View>

        {/* Segmented Control */}
        <RecordsTabs
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          counts={{
            treatments: treatments.length,
            invoices: invoices.length,
          }}
        />

        {/* Sub-tab 1: Treatments */}
        {activeTab === 'treatments' && (
          <View>
            {isLoadingTreatments ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xs text-slate-500 mt-3 font-medium">
                  Loading clinical treatments...
                </Text>
              </View>
            ) : isErrorTreatments ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-5 items-center my-4">
                <AlertCircle size={32} color="#dc2626" />
                <Text className="text-sm font-bold text-red-900 mt-2">
                  Failed to load treatments
                </Text>
                <Text className="text-xs text-red-700 text-center mt-1 mb-4">
                  {treatmentsError instanceof Error
                    ? treatmentsError.message
                    : 'Please check your connection and try again.'}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => refetchTreatments()}
                >
                  Try Again
                </Button>
              </View>
            ) : treatments.length === 0 ? (
              /* Empty state */
              <View className="bg-white rounded-3xl border border-slate-200/80 p-8 items-center text-center my-2 shadow-xs">
                <View className="w-14 h-14 rounded-2xl bg-emerald-50 items-center justify-center mb-3.5 border border-emerald-100">
                  <Stethoscope size={28} color="#059669" />
                </View>
                <Text className="text-base font-bold text-slate-900 mb-1">
                  No treatments on record yet
                </Text>
                <Text className="text-xs text-slate-500 text-center leading-relaxed mb-5 max-w-xs">
                  Procedures and restorative dental work performed during your
                  visits will be documented here. Book a checkup to get started.
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(tabs)/doctors')}
                >
                  Book Appointment
                </Button>
              </View>
            ) : (
              <View>
                {/* Total spent summary banner */}
                <View className="bg-emerald-900 rounded-3xl p-5 mb-4 shadow-sm relative overflow-hidden">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
                        Total Clinical Care
                      </Text>
                      <Text className="text-2xl font-black text-white mt-1">
                        {formatPKR(totalSpent)}
                      </Text>
                      <Text className="text-xs text-emerald-300 mt-0.5 font-medium">
                        Across {treatments.length}{' '}
                        {treatments.length === 1 ? 'procedure' : 'procedures'}{' '}
                        completed
                      </Text>
                    </View>
                    <View className="w-12 h-12 rounded-2xl bg-emerald-800/80 items-center justify-center border border-emerald-700/50">
                      <Stethoscope size={24} color="#6ee7b7" />
                    </View>
                  </View>
                </View>

                {/* Treatment list */}
                {treatments.map((t) => (
                  <TreatmentCard key={t.id} treatment={t} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Sub-tab 2: Chart */}
        {activeTab === 'chart' && (
          <View>
            {isLoadingChart ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xs text-slate-500 mt-3 font-medium">
                  Loading dental odontogram...
                </Text>
              </View>
            ) : isErrorChart ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-5 items-center my-4">
                <AlertCircle size={32} color="#dc2626" />
                <Text className="text-sm font-bold text-red-900 mt-2">
                  Failed to load dental chart
                </Text>
                <Text className="text-xs text-red-700 text-center mt-1 mb-4">
                  {chartError instanceof Error
                    ? chartError.message
                    : 'Please check your connection and try again.'}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => refetchChart()}
                >
                  Try Again
                </Button>
              </View>
            ) : (
              <View>
                <ChartMini teeth={teeth} />
              </View>
            )}
          </View>
        )}

        {/* Sub-tab 3: Invoices */}
        {activeTab === 'invoices' && (
          <View>
            {isLoadingInvoices ? (
              <View className="py-12 items-center justify-center">
                <ActivityIndicator size="large" color="#059669" />
                <Text className="text-xs text-slate-500 mt-3 font-medium">
                  Loading invoices and receipts...
                </Text>
              </View>
            ) : isErrorInvoices ? (
              <View className="bg-red-50 border border-red-200 rounded-2xl p-5 items-center my-4">
                <AlertCircle size={32} color="#dc2626" />
                <Text className="text-sm font-bold text-red-900 mt-2">
                  Failed to load invoices
                </Text>
                <Text className="text-xs text-red-700 text-center mt-1 mb-4">
                  {invoicesError instanceof Error
                    ? invoicesError.message
                    : 'Please check your connection and try again.'}
                </Text>
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => refetchInvoices()}
                >
                  Try Again
                </Button>
              </View>
            ) : invoices.length === 0 ? (
              /* Empty state */
              <View className="bg-white rounded-3xl border border-slate-200/80 p-8 items-center text-center my-2 shadow-xs">
                <View className="w-14 h-14 rounded-2xl bg-slate-100 items-center justify-center mb-3.5 border border-slate-200">
                  <Receipt size={28} color="#64748b" />
                </View>
                <Text className="text-base font-bold text-slate-900 mb-1">
                  No invoices yet
                </Text>
                <Text className="text-xs text-slate-500 text-center leading-relaxed mb-5 max-w-xs">
                  Your billing statements, payments, and official receipts will
                  appear here after treatment.
                </Text>
                <Button
                  variant="primary"
                  onPress={() => router.push('/(tabs)/doctors')}
                >
                  Book Appointment
                </Button>
              </View>
            ) : (
              <View>
                {/* Dual Financial Metrics Cards */}
                <View className="flex-row gap-3 mb-4">
                  {/* Card 1: Total Billed */}
                  <View className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Total Billed
                      </Text>
                      <View className="w-6 h-6 rounded-lg bg-emerald-50 items-center justify-center">
                        <CreditCard size={13} color="#059669" />
                      </View>
                    </View>
                    <Text className="text-lg font-black text-slate-900 mt-2">
                      {formatPKR(totalBilled)}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">
                      {invoices.length} statements issued
                    </Text>
                  </View>

                  {/* Card 2: Total Outstanding */}
                  <View className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-xs">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Outstanding
                      </Text>
                      <View className="w-6 h-6 rounded-lg bg-rose-50 items-center justify-center">
                        <Coins size={13} color="#e11d48" />
                      </View>
                    </View>
                    <Text
                      className={`text-lg font-black mt-2 ${
                        totalOutstanding > 0
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {formatPKR(totalOutstanding)}
                    </Text>
                    <Text className="text-[10px] text-slate-400 mt-0.5">
                      {totalOutstanding > 0 ? 'Pending payment' : 'Fully cleared'}
                    </Text>
                  </View>
                </View>

                {/* Invoices list */}
                {invoices.map((inv) => (
                  <InvoiceCard key={inv.id} invoice={inv} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
