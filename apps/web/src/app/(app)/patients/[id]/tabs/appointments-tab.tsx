import { Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export interface PatientAppointmentItem {
  id: string;
  startAt: string;
  endAt: string;
  status: 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
  reason: string | null;
  notes: string | null;
  dentistName: string;
}

interface AppointmentsTabProps {
  appointments: PatientAppointmentItem[];
}

export function AppointmentsTab({ appointments }: AppointmentsTabProps) {
  if (appointments.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-12 text-center space-y-3">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
          <Calendar className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No appointments recorded
        </p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This patient does not have any previous or upcoming scheduled visits.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-semibold">Date & Time</th>
              <th className="px-6 py-4 font-semibold">Attending Doctor</th>
              <th className="px-6 py-4 font-semibold">Reason</th>
              <th className="px-6 py-4 font-semibold">Status</th>
              <th className="px-6 py-4 font-semibold">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((apt) => {
              const startDate = new Date(apt.startAt);
              return (
                <tr key={apt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <td className="px-6 py-4">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {startDate.toLocaleDateString('en-PK', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {startDate.toLocaleTimeString('en-PK', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {apt.dentistName}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <span className="text-slate-700 dark:text-slate-300">
                      {apt.reason || 'General Checkup'}
                    </span>
                  </td>

                  <td className="px-6 py-4">
                    <StatusBadge status={apt.status} />
                  </td>

                  <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                    {apt.notes || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: 'scheduled' | 'confirmed' | 'arrived' | 'completed' | 'no_show' | 'cancelled';
}) {
  switch (status) {
    case 'completed':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </span>
      );
    case 'confirmed':
    case 'scheduled':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200">
          <Calendar className="h-3 w-3" />
          {status === 'confirmed' ? 'Confirmed' : 'Scheduled'}
        </span>
      );
    case 'arrived':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200">
          <Clock className="h-3 w-3" />
          Arrived
        </span>
      );
    case 'cancelled':
    case 'no_show':
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200">
          <XCircle className="h-3 w-3" />
          {status === 'cancelled' ? 'Cancelled' : 'No Show'}
        </span>
      );
  }
}
