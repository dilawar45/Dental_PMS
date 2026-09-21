import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ArrowLeft, Calendar, Clock, User, AlertCircle } from 'lucide-react-native';
import { Screen } from '../components/ui/screen';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Chip } from '../components/ui/chip';
import { DoctorCard } from '../components/booking/doctor-card';
import { DatePickerStrip } from '../components/booking/date-picker-strip';
import { SlotGrid } from '../components/booking/slot-grid';
import { patientApi, Doctor, Slot, ApiError } from '../lib/api';

const QUICK_REASONS = [
  'Routine Checkup',
  'Dental Cleaning',
  'Toothache / Pain',
  'Teeth Whitening',
  'Orthodontic Consult',
  'Cavity Filling',
];

export default function BookAppointmentScreen() {
  const params = useLocalSearchParams<{ dentist_id?: string }>();
  const queryClient = useQueryClient();

  // Tomorrow as default date string YYYY-MM-DD
  const defaultDate = React.useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(
    params.dentist_id || null
  );
  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [bookedDetails, setBookedDetails] = useState<{
    doctorName: string;
    timeLabel: string;
  } | null>(null);

  // 1. Fetch Doctors
  const {
    data: doctors,
    isLoading: isLoadingDoctors,
  } = useQuery({
    queryKey: ['patient', 'doctors'],
    queryFn: () => patientApi.getDoctors(),
  });

  // Auto-select first doctor if none selected and not passed via param
  useEffect(() => {
    if (!selectedDoctorId && doctors && doctors.length > 0) {
      if (params.dentist_id) {
        setSelectedDoctorId(params.dentist_id);
      } else {
        setSelectedDoctorId(doctors[0]?.id || null);
      }
    }
  }, [doctors, params.dentist_id, selectedDoctorId]);

  // 2. Fetch Availability Slots
  const {
    data: availabilityData,
    isLoading: isLoadingSlots,
    refetch: refetchSlots,
  } = useQuery({
    queryKey: ['patient', 'availability', selectedDate, selectedDoctorId],
    queryFn: () =>
      patientApi.getAvailability(selectedDate, selectedDoctorId || undefined),
    enabled: !!selectedDate,
  });

  // Reset selected slot when date or doctor changes
  useEffect(() => {
    setSelectedSlot(null);
  }, [selectedDate, selectedDoctorId]);

  const selectedDoctor = doctors?.find((d) => d.id === selectedDoctorId) || null;

  // 3. Create Booking Mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlot) throw new Error('Please choose a time slot.');
      if (reason.trim().length < 3)
        throw new Error('Please enter a reason for your visit (min 3 characters).');

      return await patientApi.createBooking({
        slot_start: selectedSlot.start,
        slot_end: selectedSlot.end,
        dentist_id: selectedDoctorId || selectedSlot.dentist_id,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient', 'availability'] });

      const d = selectedSlot ? new Date(selectedSlot.start) : new Date();
      const timeStr = d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }) + ' · ' + d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      setBookedDetails({
        doctorName: selectedDoctor?.name || selectedSlot?.dentist_name || 'Dr. Dental Specialist',
        timeLabel: timeStr,
      });
      setIsSuccess(true);
    },
    onError: (err: unknown) => {
      // Race condition or server validation error
      refetchSlots();
      if (err instanceof ApiError) {
        setErrorMessage(
          err.message.includes('slot')
            ? 'This slot was just taken by another patient. Please pick another time.'
            : err.message
        );
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Failed to submit appointment request. Please try again.');
      }
    },
  });

  const handleSubmit = () => {
    setErrorMessage(null);
    if (!selectedDoctorId) {
      setErrorMessage('Please select a doctor.');
      return;
    }
    if (!selectedSlot) {
      setErrorMessage('Please select an appointment time slot.');
      return;
    }
    if (reason.trim().length < 3) {
      setErrorMessage('Please specify your reason for visit (minimum 3 characters).');
      return;
    }

    bookingMutation.mutate();
  };

  // SUCCESS SCREEN
  if (isSuccess && bookedDetails) {
    return (
      <Screen scroll className="p-6">
        <View className="flex-1 items-center justify-center py-10">
          <View className="w-20 h-20 bg-emerald-100 rounded-full items-center justify-center mb-5 border-4 border-emerald-200 shadow-sm">
            <CheckCircle2 color="#059669" size={48} />
          </View>

          <Text className="text-2xl font-extrabold text-slate-900 text-center tracking-tight">
            Request Submitted!
          </Text>
          <Text className="text-sm text-slate-500 text-center mt-2 px-4 leading-relaxed">
            The clinic staff will review your appointment request and confirm it shortly.
          </Text>

          <Card className="w-full my-8 p-5 bg-white border border-slate-200">
            <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Appointment Summary
            </Text>

            <View className="flex-row items-center mb-3">
              <User color="#059669" size={18} />
              <View className="ml-3">
                <Text className="text-xs text-slate-400">Dentist</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {bookedDetails.doctorName}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center mb-3">
              <Calendar color="#059669" size={18} />
              <View className="ml-3">
                <Text className="text-xs text-slate-400">Date & Time</Text>
                <Text className="text-sm font-bold text-slate-900">
                  {bookedDetails.timeLabel}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center pt-3 border-t border-slate-100">
              <Clock color="#64748b" size={16} />
              <Text className="text-xs text-slate-600 ml-2 font-medium">
                Duration: 30 minutes • Status: Pending Review
              </Text>
            </View>
          </Card>

          <Button
            title="View My Appointments"
            onPress={() => router.replace('/(tabs)/appointments')}
            size="lg"
            className="w-full mb-3"
          />

          <Button
            title="Back to Home"
            variant="outline"
            onPress={() => router.replace('/(tabs)')}
            size="md"
            className="w-full"
          />
        </View>
      </Screen>
    );
  }

  // WIZARD BOOKING FORM
  return (
    <Screen scroll className="p-5">
      {/* Top Header */}
      <View className="flex-row items-center my-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 items-center justify-center mr-3"
        >
          <ArrowLeft color="#1e293b" size={20} />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-900">
            Book Appointment
          </Text>
          <Text className="text-xs text-slate-500">
            Bright Smile Dental Care
          </Text>
        </View>
      </View>

      {/* Error Banner */}
      {errorMessage ? (
        <View className="flex-row items-center bg-red-50 border border-red-200 rounded-xl p-3.5 my-3">
          <AlertCircle color="#dc2626" size={18} />
          <Text className="text-xs text-red-700 font-medium ml-2 flex-1">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {/* STEP 1: Choose Doctor */}
      <View className="my-3">
        <Text className="text-sm font-bold text-slate-900 mb-2">
          Step 1: Choose Specialist
        </Text>
        {isLoadingDoctors ? (
          <ActivityIndicator size="small" color="#059669" />
        ) : (
          <View>
            {doctors?.map((doc) => (
              <DoctorCard
                key={doc.id}
                doctor={doc}
                selectable
                selected={doc.id === selectedDoctorId}
                onSelect={(d) => {
                  setSelectedDoctorId(d.id);
                  setErrorMessage(null);
                }}
              />
            ))}
          </View>
        )}
      </View>

      {/* STEP 2: Choose Date */}
      <View className="my-3">
        <Text className="text-sm font-bold text-slate-900 mb-2">
          Step 2: Select Date
        </Text>
        <DatePickerStrip
          selectedDate={selectedDate}
          onSelectDate={(d) => {
            setSelectedDate(d);
            setErrorMessage(null);
          }}
        />
      </View>

      {/* STEP 3: Choose Time Slot */}
      <View className="my-3">
        <Text className="text-sm font-bold text-slate-900 mb-2">
          Step 3: Select Time Slot
        </Text>
        <SlotGrid
          slots={availabilityData?.available_slots || []}
          selectedSlot={selectedSlot}
          onSelectSlot={(slot) => {
            setSelectedSlot(slot);
            setErrorMessage(null);
          }}
          isLoading={isLoadingSlots}
        />
      </View>

      {/* STEP 4: Reason & Notes */}
      <View className="my-3">
        <Text className="text-sm font-bold text-slate-900 mb-2">
          Step 4: Reason for Visit
        </Text>

        {/* Quick-Pick Chips */}
        <View className="flex-row flex-wrap mb-2">
          {QUICK_REASONS.map((r) => (
            <Chip
              key={r}
              label={r}
              selected={reason === r}
              onPress={() => {
                setReason(r);
                setErrorMessage(null);
              }}
            />
          ))}
        </View>

        <Input
          placeholder="e.g. Tooth sensitivity or checkup"
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (errorMessage) setErrorMessage(null);
          }}
          helperText="Required (minimum 3 characters)"
        />

        <Input
          label="Additional Notes (Optional)"
          placeholder="Any symptoms, preferred times, or questions..."
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          className="h-20 text-top"
        />
      </View>

      {/* Submit Button */}
      <View className="my-6 pb-6">
        <Button
          title={bookingMutation.isPending ? 'Submitting Request...' : 'Request Appointment'}
          onPress={handleSubmit}
          loading={bookingMutation.isPending}
          disabled={!selectedDoctorId || !selectedSlot || reason.trim().length < 3}
          size="lg"
        />
        <Text className="text-[11px] text-center text-slate-400 mt-2">
          Appointments are confirmed directly by clinic staff.
        </Text>
      </View>
    </Screen>
  );
}
