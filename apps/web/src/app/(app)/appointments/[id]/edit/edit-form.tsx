'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { updateAppointmentAction } from '../../actions';
import { AlertCircle } from 'lucide-react';

interface EditAppointmentFormProps {
  appointment: {
    id: string;
    patientId: string;
    patientName: string;
    dentistId: string;
    startAt: string;
    endAt: string;
    reason: string | null;
    notes: string | null;
  };
  dentists: Array<{
    id: string;
    fullName: string;
    role: string;
  }>;
}

export function EditAppointmentForm({ appointment, dentists }: EditAppointmentFormProps): React.JSX.Element {
  const router = useRouter();

  const toLocalISO = (isoStr: string) => {
    const d = new Date(isoStr);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  const [dentistId, setDentistId] = useState(appointment.dentistId);
  const [startAt, setStartAt] = useState(toLocalISO(appointment.startAt));
  const [endAt, setEndAt] = useState(toLocalISO(appointment.endAt));
  const [reason, setReason] = useState(appointment.reason || '');
  const [notes, setNotes] = useState(appointment.notes || '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleStartChange = (newStartStr: string) => {
    setStartAt(newStartStr);
    const start = new Date(newStartStr);
    if (!isNaN(start.getTime())) {
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const offset = end.getTimezoneOffset() * 60000;
      setEndAt(new Date(end.getTime() - offset).toISOString().slice(0, 16));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await updateAppointmentAction({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        dentistId,
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        reason,
        notes: notes || undefined,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.push(`/appointments/${appointment.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update appointment');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <p className="font-semibold">Scheduling Conflict / Update Error</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm space-y-5">
        {/* Patient (Read-only on reschedule) */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Patient
          </label>
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            {appointment.patientName}
          </div>
        </div>

        {/* Attending Practitioner */}
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

        {/* Date & Time */}
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

        {/* Reason */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Visit Reason / Chief Complaint *
          </label>
          <input
            type="text"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Operatory Notes
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={`/appointments/${appointment.id}`}
          className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Updating...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
