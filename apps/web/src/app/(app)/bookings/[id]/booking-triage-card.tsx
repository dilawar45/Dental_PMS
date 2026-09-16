'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  approveBookingRequestAction,
  rejectBookingRequestAction,
  linkBookingPatientAction,
} from '../actions';
import {
  CheckCircle,
  XCircle,
  Link as LinkIcon,
  UserPlus,
  AlertCircle,
  Calendar,
  Clock,
  UserCheck,
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

interface BookingTriageCardProps {
  booking: {
    id: string;
    patientId: string | null;
    patientName: string | null;
    rawName: string | null;
    phone: string;
    requestedSlotStart: string;
    requestedSlotEnd: string;
    reason: string | null;
    status: string;
    requestedVia: string;
  };
  dentists: DentistOption[];
  patients: PatientOption[];
}

export function BookingTriageCard({ booking, dentists, patients }: BookingTriageCardProps) {
  const router = useRouter();

  const toLocalISO = (isoStr: string) => {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [activeTab, setActiveTab] = useState<'approve' | 'reject' | 'link'>(
    booking.patientId ? 'approve' : 'link'
  );

  // Approve state
  const [selectedDentistId, setSelectedDentistId] = useState(dentists[0]?.id ?? '');
  const [startAt, setStartAt] = useState(toLocalISO(booking.requestedSlotStart));
  const [endAt, setEndAt] = useState(toLocalISO(booking.requestedSlotEnd));

  // Reject state
  const [rejectReason, setRejectReason] = useState(
    'Requested slot unavailable; patient could not be reached for rescheduling.'
  );

  // Link patient state
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedLinkPatientId, setSelectedLinkPatientId] = useState(patients[0]?.id ?? '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredPatients = patients.filter(
    (p) =>
      p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) ||
      p.phone.includes(patientSearch)
  );

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await approveBookingRequestAction({
        bookingRequestId: booking.id,
        dentistId: selectedDentistId,
        patientId: booking.patientId || selectedLinkPatientId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.push(`/appointments/${res.data.appointmentId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to approve booking request');
      setLoading(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirm('Are you sure you want to reject this booking request?')) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await rejectBookingRequestAction({
        bookingRequestId: booking.id,
        reason: rejectReason,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.push('/bookings');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reject booking request');
      setLoading(false);
    }
  };

  const handleLinkPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await linkBookingPatientAction({
        bookingRequestId: booking.id,
        patientId: selectedLinkPatientId,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.refresh();
      setActiveTab('approve');
      setLoading(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to link patient');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 pt-2 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('approve')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'approve'
              ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <CheckCircle className="h-3.5 w-3.5" />
          <span>Approve & Book</span>
        </button>

        {!booking.patientId && (
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-amber-500 text-amber-700 dark:text-amber-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <LinkIcon className="h-3.5 w-3.5" />
            <span>Link Patient</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('reject')}
          className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'reject'
              ? 'border-red-600 text-red-700 dark:text-red-400 bg-white dark:bg-slate-900'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          <XCircle className="h-3.5 w-3.5" />
          <span>Reject Request</span>
        </button>
      </div>

      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold">Triage Error</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* TAB 1: APPROVE WORKFLOW */}
        {activeTab === 'approve' && (
          <form onSubmit={handleApprove} className="space-y-5">
            {!booking.patientId && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/50 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                <span>
                  ⚠️ This request has no linked patient profile yet. You must link an existing
                  patient or create a profile first.
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab('link')}
                  className="underline font-bold"
                >
                  Link Now
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Assign Attending Practitioner *
              </label>
              <select
                value={selectedDentistId}
                onChange={(e) => setSelectedDentistId(e.target.value)}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirmed Start Slot *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Confirmed End Slot *
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

            <p className="text-xs text-slate-500">
              Approving will automatically convert this inquiry into a confirmed operatory
              appointment and update the triage status.
            </p>

            <button
              type="submit"
              disabled={loading || (!booking.patientId && !selectedLinkPatientId)}
              className="w-full sm:w-auto rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating Appointment...' : 'Approve & Create Confirmed Appointment'}
            </button>
          </form>
        )}

        {/* TAB 2: LINK PATIENT WORKFLOW */}
        {activeTab === 'link' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/60 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Option A: Create New Patient Profile
              </h4>
              <p className="text-xs text-slate-500">
                If this is a first-time patient contacting via {booking.requestedVia}, register their
                demographic chart first:
              </p>
              <Link
                href={`/patients/new?phone=${encodeURIComponent(booking.phone)}&name=${encodeURIComponent(
                  booking.rawName || ''
                )}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Register New Patient ({booking.phone})</span>
              </Link>
            </div>

            <form onSubmit={handleLinkPatient} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Option B: Link to Existing Patient in Directory
              </h4>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter existing patients by name or phone..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <select
                value={selectedLinkPatientId}
                onChange={(e) => setSelectedLinkPatientId(e.target.value)}
                required
                size={5}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id} className="py-1">
                    {p.fullName} — {p.phone}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-semibold shadow-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Linking...' : 'Link This Patient to Booking Request'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: REJECT WORKFLOW */}
        {activeTab === 'reject' && (
          <form onSubmit={handleReject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Rejection / Cancellation Reason *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <p className="text-xs text-slate-500">
              The booking request will be marked as rejected and this reason will be preserved in the
              permanent audit log.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
