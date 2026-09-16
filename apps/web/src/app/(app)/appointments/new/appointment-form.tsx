'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createAppointmentAction } from '../actions';
import {
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  AlertCircle,
  ArrowLeft,
  Search,
} from 'lucide-react';

interface PatientOption {
  id: string;
  fullName: string;
  phone: string;
}

interface DentistOption {
  id: string;
  fullName: string;
  role: string;
}

interface AppointmentFormProps {
  patients: PatientOption[];
  dentists: DentistOption[];
  defaultPatientId?: string;
  defaultStartAt?: string;
}

export function AppointmentForm({
  patients,
  dentists,
  defaultPatientId,
  defaultStartAt,
}: AppointmentFormProps) {
  const router = useRouter();

  // Initial timing: tomorrow at 10:00 AM if not supplied
  const getDefaultDates = () => {
    let start: Date;
    if (defaultStartAt && !isNaN(Date.parse(defaultStartAt))) {
      start = new Date(defaultStartAt);
    } else {
      start = new Date();
      start.setDate(start.getDate() + 1);
      start.setHours(10, 0, 0, 0);
    }
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const toLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    return {
      startStr: toLocalISO(start),
      endStr: toLocalISO(end),
    };
  };

  const initialDates = getDefaultDates();

  const [patientId, setPatientId] = useState(defaultPatientId || (patients[0]?.id ?? ''));
  const [patientSearch, setPatientSearch] = useState('');
  const [dentistId, setDentistId] = useState(dentists[0]?.id ?? '');
  const [startAt, setStartAt] = useState(initialDates.startStr);
  const [endAt, setEndAt] = useState(initialDates.endStr);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-adjust end time when start time changes (default +30 mins)
  const handleStartChange = (newStartStr: string) => {
    setStartAt(newStartStr);
    const start = new Date(newStartStr);
    if (!isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const offset = end.getTimezoneOffset() * 60000;
      setEndAt(new Date(end.getTime() - offset).toISOString().slice(0, 16));
    }
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createAppointmentAction({
        patientId,
        dentistId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        reason,
        notes: notes || undefined,
      });

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(`/appointments/${result.data.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Scheduling Conflict / Validation Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        {/* Patient Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Patient *
          </label>
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient by name or phone..."
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              required
              size={5}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {filteredPatients.length === 0 ? (
                <option disabled value="">
                  No patients match search
                </option>
              ) : (
                filteredPatients.map((p) => (
                  <option key={p.id} value={p.id} className="py-1">
                    {p.fullName} ({p.phone})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Practitioner Selection */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Attending Practitioner *
          </label>
          <select
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.role.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={startAt}
              onChange={(e) => handleStartChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              required
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Reason for Visit */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Chief Complaint / Visit Reason *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Toothache on lower left molar, scaling, crown seating"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Internal Operatory Notes (Optional)
          </label>
          <textarea
            rows={3}
            placeholder="Special instructions, medical pre-medication required, operatory chair preferences..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href="/appointments"
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Validating & Booking...' : 'Schedule Appointment'}
        </button>
      </div>
    </form>
  );
}
