'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { changeAppointmentStatusAction } from '../actions';
import type { AppointmentStatus, UserRole } from '@dental-pms/types';
import {
  CheckCircle,
  XCircle,
  UserCheck,
  UserX,
  Edit,
  Clock,
  AlertCircle,
} from 'lucide-react';

interface StatusActionsProps {
  appointmentId: string;
  currentStatus: AppointmentStatus;
  userRole: UserRole;
}

export function StatusActions({
  appointmentId,
  currentStatus,
  userRole,
}: StatusActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = ['owner', 'receptionist'].includes(userRole);
  if (!canManage) {
    return null;
  }

  const handleStatusChange = async (targetStatus: AppointmentStatus) => {
    if (
      targetStatus === 'cancelled' &&
      !confirm('Are you sure you want to cancel this appointment?')
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await changeAppointmentStatusAction({
        appointmentId,
        targetStatus,
      });

      if (!res.success) {
        setError(res.error);
        setLoading(false);
        return;
      }

      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Status: SCHEDULED */}
        {currentStatus === 'scheduled' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('confirmed')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Confirm Appointment</span>
            </button>

            <Link
              href={`/appointments/${appointmentId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Reschedule / Edit</span>
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('cancelled')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-sm disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* Status: CONFIRMED */}
        {currentStatus === 'confirmed' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('arrived')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Mark Arrived</span>
            </button>

            <Link
              href={`/appointments/${appointmentId}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Edit className="h-3.5 w-3.5" />
              <span>Reschedule / Edit</span>
            </Link>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('no_show')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-sm disabled:opacity-50 transition-colors"
            >
              <UserX className="h-3.5 w-3.5" />
              <span>Mark No Show</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('cancelled')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-sm disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* Status: ARRIVED */}
        {currentStatus === 'arrived' && (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('completed')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              <span>Mark Completed</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleStatusChange('cancelled')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 shadow-sm disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          </>
        )}

        {/* Terminal Statuses */}
        {['completed', 'no_show', 'cancelled'].includes(currentStatus) && (
          <p className="text-xs text-slate-400 italic">
            This appointment has reached its terminal status ({currentStatus}). No further
            modifications are permitted.
          </p>
        )}
      </div>
    </div>
  );
}
